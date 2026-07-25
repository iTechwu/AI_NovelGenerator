"""Internal Python runtime. It is intentionally reachable only through NestJS."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import secrets
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field, model_validator

from runtime.engine import GenerationEngine, RuntimeSettings

# Use the OS trust store for TLS verification (macOS Keychain / Windows / Linux
# system roots). Internal gateways whose CA is trusted by the OS — but not by
# certifi — then work without disabling verification or shipping a CA bundle.
# Safe no-op when truststore is not installed.
try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass


logger = logging.getLogger(__name__)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ProjectInput(BaseModel):
    id: UUID
    title: str = Field(min_length=1, max_length=120)
    format: Literal['novel'] = 'novel'
    genre: str = Field(min_length=1, max_length=80)
    premise: str = Field(min_length=20, max_length=4000)
    chapterCount: int = Field(ge=1, le=500)
    targetWordsPerChapter: int = Field(ge=500, le=20_000)
    guidance: str = Field(default='', max_length=2_000)
    generateOutline: bool = True


class CreateJobRequest(BaseModel):
    ownerId: UUID
    jobId: UUID
    project: ProjectInput
    kind: Literal['blueprint', 'chapter_draft'] = 'blueprint'
    blueprint: 'BlueprintInput | None' = None
    chapterPlan: 'ChapterPlanInput | None' = None
    prompt: str = Field(default='', max_length=2_000)

    @model_validator(mode='after')
    def require_confirmed_inputs_for_chapter_draft(self):
        if self.kind == 'chapter_draft' and (not self.blueprint or not self.chapterPlan):
            raise ValueError('chapter_draft requires blueprint and chapterPlan')
        return self


class BlueprintInput(BaseModel):
    id: UUID
    architecture: str
    outline: str = ''


class ChapterPlanInput(BaseModel):
    id: UUID
    chapterNumber: int = Field(ge=1)
    title: str
    goal: str
    conflict: str = ''
    characters: list[str] = Field(default_factory=list)
    location: str = ''
    timeConstraint: str = ''
    foreshadowing: str = ''
    hook: str = ''


class ProjectSummary(ProjectInput):
    pass


class GenerationJob(BaseModel):
    id: UUID
    ownerId: UUID
    project: ProjectSummary
    kind: Literal['blueprint', 'chapter_draft'] = 'blueprint'
    blueprint: BlueprintInput | None = None
    chapterPlan: ChapterPlanInput | None = None
    prompt: str = ''
    modelConfig: dict[str, str] = Field(default_factory=dict)
    status: Literal['queued', 'running', 'succeeded', 'failed', 'cancelled']
    progress: int = Field(ge=0, le=100)
    currentStep: str
    attemptCount: int = Field(default=0, ge=0)
    artifact: dict[str, Any] | None = None
    error: str | None = None
    createdAt: datetime
    updatedAt: datetime


class FinalizationTaskRequest(BaseModel):
    taskId: UUID
    projectId: UUID
    revisionId: UUID
    chapterNumber: int = Field(ge=1)
    type: Literal['summary', 'index']
    content: str = Field(min_length=1, max_length=200_000)


class FinalizationTaskResult(BaseModel):
    type: Literal['summary', 'index']
    revisionId: UUID
    chapterNumber: int
    summary: str | None = None
    contentChecksum: str | None = None
    characterCount: int | None = None


class HardFactReviewFact(BaseModel):
    id: UUID
    subject: str = Field(min_length=1)
    predicate: str = Field(min_length=1)
    value: str = Field(min_length=1)


class HardFactReviewRequest(BaseModel):
    content: str = Field(min_length=1, max_length=200_000)
    facts: list[HardFactReviewFact] = Field(default_factory=list)


class HardFactReviewFinding(BaseModel):
    factId: UUID
    ruleId: Literal['hard-fact-negation']
    evidenceStart: int = Field(ge=0)
    evidenceEnd: int = Field(ge=0)
    evidence: str
    suggestedAction: str


# Load backend/.env so the runtime picks up LLM_* / NOVEL_RUNTIME_* whether it is
# launched via `pnpm start` (scripts/start-local-services.js) or `uvicorn` directly.
# override=False (default): a real process env var always wins over the file.
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / '.env')
except ImportError:
    # python-dotenv is optional; env may also be injected by the Node launcher.
    pass

settings = RuntimeSettings.from_environment()
engine = GenerationEngine(settings)
jobs: dict[UUID, GenerationJob] = {}


def checkpoint_job(job: GenerationJob) -> None:
    engine.write_checkpoint(
        job.project.id,
        job.id,
        status=job.status,
        progress=job.progress,
        current_step=job.currentStep,
        error=job.error,
        job=job.model_dump(mode='json'),
    )


def load_job_from_checkpoint(job_id: UUID) -> GenerationJob | None:
    for checkpoint_path in engine.checkpoint_paths():
        try:
            payload = json.loads(checkpoint_path.read_text(encoding='utf-8'))
            if payload.get('runId') != str(job_id) or not isinstance(payload.get('job'), dict):
                continue
            return GenerationJob.model_validate(payload['job'])
        except (OSError, json.JSONDecodeError, ValueError):
            logger.warning('Ignoring unreadable runtime checkpoint', extra={'checkpoint': str(checkpoint_path)})
    return None


async def restore_jobs() -> None:
    for checkpoint_path in engine.checkpoint_paths():
        try:
            payload = json.loads(checkpoint_path.read_text(encoding='utf-8'))
            job_payload = payload.get('job')
            if not isinstance(job_payload, dict):
                continue
            job = GenerationJob.model_validate(job_payload)
        except (OSError, json.JSONDecodeError, ValueError):
            logger.warning('Ignoring unreadable runtime checkpoint', extra={'checkpoint': str(checkpoint_path)})
            continue
        jobs[job.id] = job
        if job.status in {'queued', 'running'}:
            job.status = 'queued'
            job.currentStep = 'Recovery queued after runtime restart'
            job.updatedAt = utc_now()
            checkpoint_job(job)
            asyncio.create_task(run_job(job.id))


@asynccontextmanager
async def lifespan(_: FastAPI):
    await restore_jobs()
    yield


app = FastAPI(title='Hanlin Novel Runtime', docs_url=None, redoc_url=None, lifespan=lifespan)


def require_internal_access(x_runtime_secret: str = Header(default='')) -> None:
    if not secrets.compare_digest(x_runtime_secret, settings.shared_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Unauthorized runtime caller')


async def run_job(job_id: UUID) -> None:
    job = jobs[job_id]
    job.status = 'running'
    job.attemptCount += 1
    job.progress = 10
    job.currentStep = 'Preparing project workspace'
    job.updatedAt = utc_now()
    checkpoint_job(job)

    try:
        if job.kind == 'chapter_draft':
            if not job.blueprint or not job.chapterPlan:
                raise RuntimeError('Chapter draft job is missing confirmed inputs')
            artifact = await asyncio.to_thread(
                engine.generate_chapter_draft,
                job.project,
                job.blueprint,
                job.chapterPlan,
                job.prompt,
                job.id,
                lambda progress, step: update_job(job, progress, step),
            )
        else:
            artifact = await asyncio.to_thread(
                engine.generate,
                job.project,
                job.id,
                lambda progress, step: update_job(job, progress, step),
            )
        if job.status != 'cancelled':
            job.status = 'succeeded'
            job.progress = 100
            job.currentStep = 'Generation complete'
            job.artifact = artifact
    except Exception:  # Details stay in the service log, never in the browser response.
        if job.status == 'cancelled':
            logger.info('Generation job stopped after cancellation', extra={'job_id': str(job.id)})
        else:
            logger.exception('Generation job failed', extra={'job_id': str(job.id)})
            job.status = 'failed'
            job.progress = 100
            job.currentStep = 'Generation failed'
            job.error = 'The generation service could not complete this request.'
    finally:
        job.updatedAt = utc_now()
        checkpoint_job(job)


def update_job(job: GenerationJob, progress: int, step: str) -> None:
    if job.status == 'cancelled':
        return
    job.progress = progress
    job.currentStep = step
    job.updatedAt = utc_now()
    checkpoint_job(job)


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@app.post('/v1/generation-jobs', response_model=GenerationJob, status_code=status.HTTP_202_ACCEPTED)
async def create_generation_job(
    request: CreateJobRequest,
    _: None = Depends(require_internal_access),
) -> GenerationJob:
    existing = jobs.get(request.jobId) or load_job_from_checkpoint(request.jobId)
    if existing:
        if existing.ownerId != request.ownerId or existing.project.id != request.project.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Generation job id conflict')
        return existing

    now = utc_now()
    job = GenerationJob(
        id=request.jobId,
        ownerId=request.ownerId,
        project=ProjectSummary(**request.project.model_dump()),
        kind=request.kind,
        blueprint=request.blueprint,
        chapterPlan=request.chapterPlan,
        prompt=request.prompt,
        modelConfig={
            'provider': 'python-runtime',
            'model': engine._settings.model,
            'interfaceFormat': engine._settings.interface_format,
            'temperature': str(engine._settings.temperature),
            'maxTokens': str(engine._settings.max_tokens),
            'models': {
                'architecture': engine._settings.model_architecture,
                'outline': engine._settings.model_outline,
                'chapterDraft': engine._settings.model_chapter_draft,
                'consistencyReview': engine._settings.model_consistency_review,
            },
        },
        status='queued',
        progress=0,
        currentStep='Queued for generation',
        createdAt=now,
        updatedAt=now,
    )
    jobs[job.id] = job
    engine.write_input_snapshot(job.project.id, job.id, {
        'kind': job.kind,
        'project': job.project.model_dump(mode='json'),
        'blueprint': job.blueprint.model_dump(mode='json') if job.blueprint else None,
        'chapterPlan': job.chapterPlan.model_dump(mode='json') if job.chapterPlan else None,
        'prompt': job.prompt,
        'modelConfig': job.modelConfig,
    })
    checkpoint_job(job)
    asyncio.create_task(run_job(job.id))
    return job


@app.get('/v1/generation-jobs/{job_id}', response_model=GenerationJob)
def get_generation_job(
    job_id: UUID,
    owner_id: UUID,
    _: None = Depends(require_internal_access),
) -> GenerationJob:
    job = jobs.get(job_id) or load_job_from_checkpoint(job_id)
    if not job or job.ownerId != owner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Generation job not found')
    return job


@app.post('/v1/finalization-tasks', response_model=FinalizationTaskResult)
async def execute_finalization_task(
    request: FinalizationTaskRequest,
    _: None = Depends(require_internal_access),
) -> FinalizationTaskResult:
    return FinalizationTaskResult.model_validate(
        await asyncio.to_thread(
            engine.execute_finalization_task,
            request.projectId,
            request.taskId,
            request.revisionId,
            request.chapterNumber,
            request.type,
            request.content,
        ),
    )


@app.post('/v1/reviews/hard-facts', response_model=list[HardFactReviewFinding])
async def review_hard_facts(
    request: HardFactReviewRequest,
    _: None = Depends(require_internal_access),
) -> list[HardFactReviewFinding]:
    findings: list[HardFactReviewFinding] = []
    for fact in request.facts:
        pattern = re.compile(
            rf'{re.escape(fact.subject)}[^。！？!?]{{0,80}}(?:不是|并非|没有|未曾)[^。！？!?]{{0,40}}{re.escape(fact.value)}'
        )
        for match in pattern.finditer(request.content):
            findings.append(HardFactReviewFinding(
                factId=fact.id,
                ruleId='hard-fact-negation',
                evidenceStart=match.start(),
                evidenceEnd=match.end(),
                evidence=match.group(0),
                suggestedAction=f'请修改正文，或为已确认事实“{fact.subject} / {fact.predicate} / {fact.value}”记录有意变更理由。',
            ))
    return findings


@app.post('/v1/generation-jobs/{job_id}/retry', response_model=GenerationJob, status_code=status.HTTP_202_ACCEPTED)
async def retry_generation_job(
    job_id: UUID,
    owner_id: UUID,
    _: None = Depends(require_internal_access),
) -> GenerationJob:
    job = jobs.get(job_id) or load_job_from_checkpoint(job_id)
    if not job or job.ownerId != owner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Generation job not found')
    if job.status not in {'failed', 'queued', 'cancelled'}:
        return job
    jobs[job.id] = job
    job.status = 'queued'
    job.progress = 0
    job.currentStep = 'Queued for retry'
    job.error = None
    job.updatedAt = utc_now()
    checkpoint_job(job)
    asyncio.create_task(run_job(job.id))
    return job


@app.post('/v1/generation-jobs/{job_id}/cancel', response_model=GenerationJob, status_code=status.HTTP_202_ACCEPTED)
async def cancel_generation_job(
    job_id: UUID,
    owner_id: UUID,
    _: None = Depends(require_internal_access),
) -> GenerationJob:
    job = jobs.get(job_id) or load_job_from_checkpoint(job_id)
    if not job or job.ownerId != owner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Generation job not found')
    if job.status in {'succeeded', 'failed', 'cancelled'}:
        return job
    jobs[job.id] = job
    job.status = 'cancelled'
    job.currentStep = 'Cancellation requested'
    job.updatedAt = utc_now()
    checkpoint_job(job)
    return job
