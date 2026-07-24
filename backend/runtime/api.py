"""Internal Python runtime. It is intentionally reachable only through NestJS."""

from __future__ import annotations

import asyncio
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field, model_validator

from runtime.engine import GenerationEngine, RuntimeSettings


logger = logging.getLogger(__name__)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ProjectInput(BaseModel):
    id: UUID
    title: str = Field(min_length=1, max_length=120)
    format: Literal['novel', 'screenplay'] = 'novel'
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
    status: Literal['queued', 'running', 'succeeded', 'failed']
    progress: int = Field(ge=0, le=100)
    currentStep: str
    artifact: dict[str, Any] | None = None
    error: str | None = None
    createdAt: datetime
    updatedAt: datetime


settings = RuntimeSettings.from_environment()
engine = GenerationEngine(settings)
jobs: dict[UUID, GenerationJob] = {}
app = FastAPI(title='Hanlin Novel Runtime', docs_url=None, redoc_url=None)


def require_internal_access(x_runtime_secret: str = Header(default='')) -> None:
    if not secrets.compare_digest(x_runtime_secret, settings.shared_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Unauthorized runtime caller')


async def run_job(job_id: UUID) -> None:
    job = jobs[job_id]
    job.status = 'running'
    job.progress = 10
    job.currentStep = 'Preparing project workspace'
    job.updatedAt = utc_now()
    write_checkpoint(job)

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
        job.status = 'succeeded'
        job.progress = 100
        job.currentStep = 'Generation complete'
        job.artifact = artifact
    except Exception:  # Details stay in the service log, never in the browser response.
        logger.exception('Generation job failed', extra={'job_id': str(job.id)})
        job.status = 'failed'
        job.progress = 100
        job.currentStep = 'Generation failed'
        job.error = 'The generation service could not complete this request.'
    finally:
        job.updatedAt = utc_now()
        write_checkpoint(job)


def update_job(job: GenerationJob, progress: int, step: str) -> None:
    job.progress = progress
    job.currentStep = step
    job.updatedAt = utc_now()
    write_checkpoint(job)


def write_checkpoint(job: GenerationJob) -> None:
    engine.write_checkpoint(
        job.project.id,
        job.id,
        status=job.status,
        progress=job.progress,
        current_step=job.currentStep,
        error=job.error,
    )


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@app.post('/v1/generation-jobs', response_model=GenerationJob, status_code=status.HTTP_202_ACCEPTED)
async def create_generation_job(
    request: CreateJobRequest,
    _: None = Depends(require_internal_access),
) -> GenerationJob:
    existing = jobs.get(request.jobId)
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
    write_checkpoint(job)
    asyncio.create_task(run_job(job.id))
    return job


@app.get('/v1/generation-jobs/{job_id}', response_model=GenerationJob)
def get_generation_job(
    job_id: UUID,
    owner_id: UUID,
    _: None = Depends(require_internal_access),
) -> GenerationJob:
    job = jobs.get(job_id)
    if not job or job.ownerId != owner_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Generation job not found')
    return job
