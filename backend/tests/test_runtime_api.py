import asyncio
import json
import os
from pathlib import Path
from uuid import UUID

os.environ.setdefault('NOVEL_RUNTIME_SHARED_SECRET', 'test-runtime-secret')

from runtime import api
from runtime.engine import GenerationEngine, RuntimeSettings


OWNER_ID = '0e3a7e4b-9bb5-4c8e-a1a3-7b6b0861c5ad'
PROJECT_ID = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1'
RUN_ID = 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a'


def make_request(run_id: str = RUN_ID) -> api.CreateJobRequest:
    return api.CreateJobRequest(
        ownerId=OWNER_ID,
        jobId=run_id,
        project={
            'id': PROJECT_ID,
            'title': '雾港来信',
            'genre': '悬疑',
            'premise': '一封迟到二十年的信件，让雾港的失踪案重新浮出水面。',
            'chapterCount': 20,
            'targetWordsPerChapter': 3000,
        },
    )


def test_runtime_workspace_is_isolated_by_project_and_run(tmp_path: Path) -> None:
    settings = RuntimeSettings(
        storage_root=tmp_path,
        shared_secret='test-runtime-secret',
        api_key='test-key',
        base_url='https://example.test/v1',
        model='test-model',
        interface_format='OpenAI',
        temperature=0.7,
        max_tokens=100,
        timeout_seconds=10,
    )

    engine = GenerationEngine(settings)

    assert engine.workspace_for(UUID(PROJECT_ID), UUID(RUN_ID)) == (
        tmp_path / PROJECT_ID / 'outputs' / RUN_ID
    )
    assert engine.checkpoint_path(UUID(PROJECT_ID), UUID(RUN_ID)) == (
        tmp_path / PROJECT_ID / 'checkpoints' / RUN_ID / 'status.json'
    )


def test_runtime_writes_completion_checkpoint_for_the_nest_run_id(
    monkeypatch,
    tmp_path: Path,
) -> None:
    api.jobs.clear()
    monkeypatch.setattr(api.engine, '_settings', RuntimeSettings(
        storage_root=tmp_path,
        shared_secret='test-runtime-secret',
        api_key='test-key',
        base_url='https://example.test/v1',
        model='test-model',
        interface_format='OpenAI',
        temperature=0.7,
        max_tokens=100,
        timeout_seconds=10,
    ))
    monkeypatch.setattr(
        api.engine,
        'generate',
        lambda project, run_id, report: {'architecture': f'run={run_id}'},
    )

    async def create_and_finish() -> api.GenerationJob:
        job = await api.create_generation_job(make_request(), None)
        await asyncio.sleep(0.05)
        return api.jobs[job.id]

    job = asyncio.run(create_and_finish())
    checkpoint = tmp_path / PROJECT_ID / 'checkpoints' / RUN_ID / 'status.json'
    input_snapshot = tmp_path / PROJECT_ID / 'inputs' / RUN_ID / 'request.json'

    assert job.status == 'succeeded'
    assert job.artifact == {'architecture': f'run={RUN_ID}'}
    assert json.loads(checkpoint.read_text(encoding='utf-8'))['status'] == 'succeeded'
    assert json.loads(input_snapshot.read_text(encoding='utf-8')) == {
        'blueprint': None,
        'chapterPlan': None,
        'kind': 'blueprint',
        'modelConfig': {
            'interfaceFormat': 'OpenAI',
            'maxTokens': '100',
            'model': 'test-model',
            'provider': 'python-runtime',
            'temperature': '0.7',
        },
        'prompt': '',
        'project': {
            'chapterCount': 20,
            'format': 'novel',
            'genre': '悬疑',
            'generateOutline': True,
            'guidance': '',
            'id': PROJECT_ID,
            'premise': '一封迟到二十年的信件，让雾港的失踪案重新浮出水面。',
            'targetWordsPerChapter': 3000,
            'title': '雾港来信',
        },
        'runId': RUN_ID,
    }


def test_repeated_request_returns_the_existing_run_without_scheduling_a_second_job(
    monkeypatch,
    tmp_path: Path,
) -> None:
    api.jobs.clear()
    scheduled: list[UUID] = []
    monkeypatch.setattr(api.engine, '_settings', RuntimeSettings(
        storage_root=tmp_path,
        shared_secret='test-runtime-secret',
        api_key='test-key',
        base_url='https://example.test/v1',
        model='test-model',
        interface_format='OpenAI',
        temperature=0.7,
        max_tokens=100,
        timeout_seconds=10,
    ))

    def record_task(coroutine):
        scheduled.append(coroutine.cr_frame.f_locals['job_id'])
        coroutine.close()

    monkeypatch.setattr(api.asyncio, 'create_task', record_task)

    async def create_twice() -> tuple[api.GenerationJob, api.GenerationJob]:
        first = await api.create_generation_job(make_request(), None)
        second = await api.create_generation_job(make_request(), None)
        return first, second

    first, second = asyncio.run(create_twice())

    assert first is second
    assert scheduled == [UUID(RUN_ID)]


def test_runtime_restores_interrupted_job_from_checkpoint_and_reschedules_it(
    monkeypatch,
    tmp_path: Path,
) -> None:
    api.jobs.clear()
    monkeypatch.setattr(api.engine, '_settings', RuntimeSettings(
        storage_root=tmp_path,
        shared_secret='test-runtime-secret',
        api_key='test-key',
        base_url='https://example.test/v1',
        model='test-model',
        interface_format='OpenAI',
        temperature=0.7,
        max_tokens=100,
        timeout_seconds=10,
    ))
    now = api.utc_now()
    interrupted = api.GenerationJob(
        id=RUN_ID,
        ownerId=OWNER_ID,
        project=api.ProjectSummary(**make_request().project.model_dump()),
        status='running',
        progress=65,
        currentStep='Generating story architecture',
        createdAt=now,
        updatedAt=now,
        attemptCount=1,
    )
    api.checkpoint_job(interrupted)
    api.jobs.clear()
    scheduled: list[UUID] = []

    def record_task(coroutine):
        scheduled.append(coroutine.cr_frame.f_locals['job_id'])
        coroutine.close()

    monkeypatch.setattr(api.asyncio, 'create_task', record_task)
    asyncio.run(api.restore_jobs())

    restored = api.jobs[UUID(RUN_ID)]
    assert restored.status == 'queued'
    assert restored.currentStep == 'Recovery queued after runtime restart'
    assert restored.attemptCount == 1
    assert scheduled == [UUID(RUN_ID)]


def test_failed_runtime_job_can_be_retried_from_a_persistent_checkpoint(
    monkeypatch,
    tmp_path: Path,
) -> None:
    api.jobs.clear()
    monkeypatch.setattr(api.engine, '_settings', RuntimeSettings(
        storage_root=tmp_path,
        shared_secret='test-runtime-secret',
        api_key='test-key',
        base_url='https://example.test/v1',
        model='test-model',
        interface_format='OpenAI',
        temperature=0.7,
        max_tokens=100,
        timeout_seconds=10,
    ))
    now = api.utc_now()
    failed = api.GenerationJob(
        id=RUN_ID,
        ownerId=OWNER_ID,
        project=api.ProjectSummary(**make_request().project.model_dump()),
        status='failed',
        progress=100,
        currentStep='Generation failed',
        error='temporary failure',
        createdAt=now,
        updatedAt=now,
        attemptCount=1,
    )
    api.checkpoint_job(failed)
    api.jobs.clear()
    scheduled: list[UUID] = []

    def record_task(coroutine):
        scheduled.append(coroutine.cr_frame.f_locals['job_id'])
        coroutine.close()

    monkeypatch.setattr(api.asyncio, 'create_task', record_task)
    retried = asyncio.run(api.retry_generation_job(UUID(RUN_ID), UUID(OWNER_ID), None))

    assert retried.status == 'queued'
    assert retried.error is None
    assert scheduled == [UUID(RUN_ID)]


def test_chapter_draft_job_preserves_confirmed_inputs_and_uses_draft_engine(
    monkeypatch,
    tmp_path: Path,
) -> None:
    api.jobs.clear()
    monkeypatch.setattr(api.engine, '_settings', RuntimeSettings(
        storage_root=tmp_path,
        shared_secret='test-runtime-secret',
        api_key='test-key',
        base_url='https://example.test/v1',
        model='test-model',
        interface_format='OpenAI',
        temperature=0.7,
        max_tokens=100,
        timeout_seconds=10,
    ))
    monkeypatch.setattr(
        api.engine,
        'generate_chapter_draft',
        lambda project, blueprint, plan, prompt, run_id, report: {
            'chapterDraft': f'{plan.title}: {prompt}',
            'factChanges': [{
                'operation': 'add',
                'factType': 'character',
                'subject': '林雾',
                'predicate': 'knows',
                'proposedValue': '旧案线索',
                'rationale': '正文明确提及',
                'evidence': '林雾握紧信件。',
                'confidence': 0.9,
            }],
        },
    )
    request = api.CreateJobRequest.model_validate({
        **make_request().model_dump(mode='json'),
        'kind': 'chapter_draft',
        'blueprint': {
            'id': '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
            'architecture': '已确认架构',
            'outline': '第 1 章：信件抵达',
        },
        'chapterPlan': {
            'id': '227dd8ce-b405-4609-bffc-e88f8842e1ab',
            'chapterNumber': 1,
            'title': '信件抵达',
            'goal': '重查旧案',
        },
        'prompt': '先写雨声。',
    })

    async def create_and_finish() -> api.GenerationJob:
        job = await api.create_generation_job(request, None)
        await asyncio.sleep(0.05)
        return api.jobs[job.id]

    job = asyncio.run(create_and_finish())
    snapshot = tmp_path / PROJECT_ID / 'inputs' / RUN_ID / 'request.json'

    assert job.status == 'succeeded'
    assert job.artifact == {
        'chapterDraft': '信件抵达: 先写雨声。',
        'factChanges': [{
            'operation': 'add',
            'factType': 'character',
            'subject': '林雾',
            'predicate': 'knows',
            'proposedValue': '旧案线索',
            'rationale': '正文明确提及',
            'evidence': '林雾握紧信件。',
            'confidence': 0.9,
        }],
    }
    assert json.loads(snapshot.read_text(encoding='utf-8'))['chapterPlan']['title'] == '信件抵达'


def test_fact_change_parser_keeps_only_complete_add_proposals() -> None:
    proposals = GenerationEngine._parse_fact_changes('''[
      {"operation":"update","factType":"character","subject":"林雾","predicate":"knows","proposedValue":"旧案","rationale":"明确","evidence":"她说起旧案。","confidence":2},
      {"operation":"add","factType":"character","subject":"林雾","predicate":"knows","proposedValue":"旧案线索","rationale":"明确","evidence":"她握紧信件。","confidence":0.84},
      {"operation":"add","factType":"","subject":"缺失","predicate":"x","proposedValue":"x","rationale":"x","evidence":"x"}
    ]''')

    assert proposals == [{
        'operation': 'add',
        'factType': 'character',
        'subject': '林雾',
        'predicate': 'knows',
        'proposedValue': '旧案',
        'rationale': '明确',
        'evidence': '她说起旧案。',
        'confidence': 1.0,
    }, {
        'operation': 'add',
        'factType': 'character',
        'subject': '林雾',
        'predicate': 'knows',
        'proposedValue': '旧案线索',
        'rationale': '明确',
        'evidence': '她握紧信件。',
        'confidence': 0.84,
    }]
