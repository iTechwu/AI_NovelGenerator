import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { apiError } from '@dofe/infra-common';
import { UnitOfWorkService } from '@dofe/infra-shared-db';
import {
  StudioBlueprintService,
  StudioChapterPlanService,
  StudioChapterDraftPointerService,
  StudioChapterFinalPointerService,
  StudioChapterFinalizationService,
  StudioChapterRevisionService,
  StudioFactChangeService,
  StudioFactService,
  StudioFinalizationOutboxTaskService,
  StudioReviewFindingService,
  StudioGenerationRunService,
  StudioProjectService,
} from '@app/db';
import type {
  StudioBlueprint,
  StudioChapterPlan,
  StudioChapterFinalization,
  StudioChapterRevision,
  StudioFact,
  StudioFactChange,
  StudioGenerationRun,
  StudioProject,
} from '@prisma/client';
import { CommonErrorCode } from '@repo/contracts/errors';
import type {
  CreateStudioProject,
  CreateStudioChapterDraft,
  CreateStudioAuthorRevision,
  GenerationJob,
  StudioBlueprint as StudioBlueprintResponse,
  StudioChapterPlan as StudioChapterPlanResponse,
  StudioChapterRevision as StudioChapterRevisionResponse,
  StudioChapterRevisionListQuery,
  StudioChapterRevisionListResponse,
  StudioChapterRevisionDiff,
  StudioChapterFinalization as StudioChapterFinalizationResponse,
  CreateStudioFactChange,
  ResolveStudioFactChange,
  StudioFactChange as StudioFactChangeResponse,
  StudioFactChangeListQuery,
  StudioFactChangeListResponse,
  StudioFactProposal,
  StudioFact as StudioFactResponse,
  StudioFactListQuery,
  StudioFactListResponse,
  StudioProjectListQuery,
  StudioProjectListResponse,
  UpdateStudioChapterPlan,
  UpdateStudioBlueprint,
} from '@repo/contracts';
import { NovelRuntimeClient } from '../../clients/novel-runtime/novel-runtime.client';

const runStatusMap = {
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
} as const satisfies Record<StudioGenerationRun['status'], GenerationJob['status']>;

const dbStatusMap = {
  queued: 'QUEUED',
  running: 'RUNNING',
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
} as const;

const blueprintStatusMap = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
} as const satisfies Record<StudioBlueprint['status'], StudioBlueprintResponse['status']>;

const chapterPlanStatusMap = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
} as const satisfies Record<StudioChapterPlan['status'], StudioChapterPlanResponse['status']>;

const chapterRevisionStatusMap = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
  SUPERSEDED: 'superseded',
} as const satisfies Record<
  StudioChapterRevision['status'],
  StudioChapterRevisionResponse['status']
>;

const MAX_DIFF_LINES = 500;

type ProjectWithLatestRun = StudioProject & { runs: StudioGenerationRun[] };

@Injectable()
export class StudioService {
  constructor(
    private readonly runtimeClient: NovelRuntimeClient,
    private readonly projectService: StudioProjectService,
    private readonly runService: StudioGenerationRunService,
    private readonly blueprintService: StudioBlueprintService,
    private readonly chapterPlanService: StudioChapterPlanService,
    private readonly chapterRevisionService: StudioChapterRevisionService,
    private readonly chapterDraftPointerService: StudioChapterDraftPointerService,
    private readonly chapterFinalPointerService: StudioChapterFinalPointerService,
    private readonly chapterFinalizationService: StudioChapterFinalizationService,
    private readonly finalizationOutboxTaskService: StudioFinalizationOutboxTaskService,
    private readonly factService: StudioFactService,
    private readonly reviewFindingService: StudioReviewFindingService,
    private readonly factChangeService: StudioFactChangeService,
    private readonly unitOfWork: UnitOfWorkService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createProject(userId: string, input: CreateStudioProject): Promise<GenerationJob> {
    const project = await this.projectService.create({
      ownerId: userId,
      ...input,
    });
    const runId = randomUUID();

    await this.runService.create({
      id: runId,
      project: { connect: { id: project.id } },
      status: 'QUEUED',
      progress: 0,
      currentStep: 'Queued for generation',
    });

    try {
      const runtimeJob = await this.runtimeClient.createJob(userId, project.id, runId, input);
      const run = await this.syncRun(runId, runtimeJob);
      return this.toGenerationJob(project, run);
    } catch (error) {
      await this.runService.update(
        { id: runId },
        {
          status: 'FAILED',
          progress: 100,
          currentStep: 'Generation service unavailable',
          error: '创作运行时暂时不可用，请稍后重试。',
        },
      );
      this.logger.error('Studio run dispatch failed', {
        projectId: project.id,
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw apiError(CommonErrorCode.InternalServerError, {
        message: '创作运行时暂时不可用，请稍后重试。',
      });
    }
  }

  async getJob(userId: string, jobId: string): Promise<GenerationJob> {
    const { project, run } = await this.getOwnedRun(userId, jobId);
    if (run.status === 'SUCCEEDED' || run.status === 'FAILED') {
      if (run.status === 'SUCCEEDED' && run.type === 'CHAPTER_DRAFT') {
        await this.createChapterRevisionFromRun(run);
      }
      return this.toGenerationJob(project, run);
    }

    try {
      const runtimeJob = await this.runtimeClient.getJob(userId, jobId);
      const syncedRun = await this.syncRun(jobId, runtimeJob);
      return this.toGenerationJob(project, syncedRun);
    } catch (error) {
      // The persisted state remains useful during a short Python-runtime outage.
      this.logger.warn('Studio run status refresh failed; serving persisted state', {
        projectId: project.id,
        runId: jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.toGenerationJob(project, run);
    }
  }

  async retryJob(userId: string, jobId: string): Promise<GenerationJob> {
    const { project, run } = await this.getOwnedRun(userId, jobId);
    if (run.status === 'SUCCEEDED') {
      throw apiError(CommonErrorCode.BadRequest, { message: '已完成的创作任务无需重试。' });
    }
    try {
      const runtimeJob = await this.runtimeClient.retryJob(userId, jobId);
      const syncedRun = await this.syncRun(jobId, runtimeJob);
      return this.toGenerationJob(project, syncedRun);
    } catch (error) {
      this.logger.error('Studio run retry dispatch failed', {
        projectId: project.id,
        runId: jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw apiError(CommonErrorCode.InternalServerError, {
        message: '创作任务暂时无法恢复，请稍后重试。',
      });
    }
  }

  async listProjects(
    userId: string,
    query: StudioProjectListQuery,
  ): Promise<StudioProjectListResponse> {
    const result = await this.projectService.list(
      { ownerId: userId },
      { page: query.page, limit: query.limit },
      { include: { runs: { orderBy: { createdAt: 'desc' }, take: 1 } } },
    );
    const projects = result as unknown as {
      list: ProjectWithLatestRun[];
      total: number;
      page: number;
      limit: number;
    };

    return {
      ...projects,
      list: projects.list.map((project) => this.toProjectListItem(project)),
    };
  }

  async getBlueprint(userId: string, projectId: string): Promise<StudioBlueprintResponse> {
    await this.getOwnedProject(userId, projectId);
    const blueprint = await this.findLatestBlueprint(projectId);
    if (!blueprint) {
      throw apiError(CommonErrorCode.NotFound, {
        message: '创作蓝图尚未生成。',
      });
    }

    return this.toBlueprint(blueprint);
  }

  async updateBlueprint(
    userId: string,
    projectId: string,
    input: UpdateStudioBlueprint,
  ): Promise<StudioBlueprintResponse> {
    await this.getOwnedProject(userId, projectId);
    const latest = await this.findLatestBlueprint(projectId);
    if (!latest) {
      throw apiError(CommonErrorCode.NotFound, {
        message: '创作蓝图尚未生成。',
      });
    }

    const contentHash = this.hashBlueprint(input.architecture, input.outline);
    const blueprint =
      latest.status === 'CONFIRMED'
        ? await this.blueprintService.create({
            project: { connect: { id: projectId } },
            version: latest.version + 1,
            status: 'DRAFT',
            architecture: input.architecture,
            outline: input.outline,
            source: 'author',
            schemaVersion: latest.schemaVersion,
            contentHash,
          })
        : await this.blueprintService.update(
            { id: latest.id },
            {
              architecture: input.architecture,
              outline: input.outline,
              source: 'author',
              contentHash,
            },
          );

    return this.toBlueprint(blueprint);
  }

  async confirmBlueprint(userId: string, projectId: string): Promise<StudioBlueprintResponse> {
    await this.getOwnedProject(userId, projectId);
    const latest = await this.findLatestBlueprint(projectId);
    if (!latest) {
      throw apiError(CommonErrorCode.NotFound, {
        message: '创作蓝图尚未生成。',
      });
    }

    const blueprint = await this.unitOfWork.execute(async () => {
      const confirmed =
        latest.status === 'CONFIRMED'
          ? latest
          : await this.blueprintService.update({ id: latest.id }, { status: 'CONFIRMED' });
      await this.projectService.update(
        { id: projectId },
        { currentBlueprint: { connect: { id: confirmed.id } } },
      );
      return confirmed;
    });

    return this.toBlueprint(blueprint);
  }

  async getChapterPlan(
    userId: string,
    projectId: string,
    chapterNumber: number,
  ): Promise<StudioChapterPlanResponse> {
    await this.getOwnedProject(userId, projectId);
    const plan = await this.findLatestChapterPlan(projectId, chapterNumber);
    if (!plan) {
      throw apiError(CommonErrorCode.NotFound, {
        message: '章节计划尚未创建。',
      });
    }

    return this.toChapterPlan(plan);
  }

  async saveChapterPlan(
    userId: string,
    projectId: string,
    chapterNumber: number,
    input: UpdateStudioChapterPlan,
  ): Promise<StudioChapterPlanResponse> {
    const project = await this.getOwnedProject(userId, projectId);
    const blueprint = await this.getConfirmedBlueprint(project);
    const latest = await this.findLatestChapterPlan(projectId, chapterNumber);
    const contentHash = this.hashChapterPlan(input);

    const plan =
      latest?.status === 'DRAFT' && latest.blueprintId === blueprint.id
        ? await this.chapterPlanService.update(
            { id: latest.id },
            {
              ...input,
              characters: input.characters,
              source: 'author',
              contentHash,
            },
          )
        : await this.chapterPlanService.create({
            project: { connect: { id: projectId } },
            blueprint: { connect: { id: blueprint.id } },
            chapterNumber,
            version: (latest?.version ?? 0) + 1,
            status: 'DRAFT',
            ...input,
            characters: input.characters,
            source: 'author',
            schemaVersion: 1,
            contentHash,
          });

    return this.toChapterPlan(plan);
  }

  async confirmChapterPlan(
    userId: string,
    projectId: string,
    chapterNumber: number,
  ): Promise<StudioChapterPlanResponse> {
    const project = await this.getOwnedProject(userId, projectId);
    await this.getConfirmedBlueprint(project);
    const latest = await this.findLatestChapterPlan(projectId, chapterNumber);
    if (!latest) {
      throw apiError(CommonErrorCode.NotFound, {
        message: '章节计划尚未创建。',
      });
    }
    if (latest.status === 'CONFIRMED') return this.toChapterPlan(latest);

    const confirmed = await this.chapterPlanService.update(
      { id: latest.id },
      { status: 'CONFIRMED' },
    );
    return this.toChapterPlan(confirmed);
  }

  async createChapterDraft(
    userId: string,
    projectId: string,
    chapterNumber: number,
    input: CreateStudioChapterDraft,
  ): Promise<GenerationJob> {
    const project = await this.getOwnedProject(userId, projectId);
    const blueprint = await this.getConfirmedBlueprint(project);
    const plan = await this.findLatestChapterPlan(projectId, chapterNumber);
    if (!plan || plan.status !== 'CONFIRMED' || plan.blueprintId !== blueprint.id) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先确认与当前蓝图一致的章节计划。',
      });
    }

    const runId = randomUUID();
    await this.runService.create({
      id: runId,
      project: { connect: { id: projectId } },
      chapterPlan: { connect: { id: plan.id } },
      type: 'CHAPTER_DRAFT',
      status: 'QUEUED',
      progress: 0,
      currentStep: 'Queued for chapter draft',
      inputSummary: input.prompt,
      modelConfig: { provider: 'python-runtime' },
    });

    try {
      const runtimeJob = await this.runtimeClient.createChapterDraftJob(
        userId,
        projectId,
        runId,
        this.toRuntimeProject(project),
        this.toBlueprint(blueprint),
        this.toChapterPlan(plan),
        input,
      );
      const run = await this.syncRun(runId, runtimeJob);
      return this.toGenerationJob(project, run);
    } catch (error) {
      await this.runService.update(
        { id: runId },
        {
          status: 'FAILED',
          progress: 100,
          currentStep: 'Chapter draft service unavailable',
          error: '章节草稿服务暂时不可用，请稍后重试。',
        },
      );
      this.logger.error('Chapter draft dispatch failed', {
        projectId,
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw apiError(CommonErrorCode.InternalServerError, {
        message: '章节草稿服务暂时不可用，请稍后重试。',
      });
    }
  }

  async getChapterRevision(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
  ): Promise<StudioChapterRevisionResponse> {
    await this.getOwnedProject(userId, projectId);
    const revision = await this.chapterRevisionService.getById(revisionId);
    if (!revision || revision.projectId !== projectId || revision.chapterNumber !== chapterNumber) {
      throw apiError(CommonErrorCode.NotFound, { message: '章节草稿不存在。' });
    }
    return this.toChapterRevision(revision);
  }

  async listChapterRevisions(
    userId: string,
    projectId: string,
    chapterNumber: number,
    query: StudioChapterRevisionListQuery,
  ): Promise<StudioChapterRevisionListResponse> {
    await this.getOwnedProject(userId, projectId);
    const [revisions, pointer, finalPointer] = await Promise.all([
      this.chapterRevisionService.list(
        { projectId, chapterNumber },
        { page: query.page, limit: query.limit, orderBy: { version: 'desc' } },
      ),
      this.chapterDraftPointerService.get({ projectId, chapterNumber }),
      this.chapterFinalPointerService.get({ projectId, chapterNumber }),
    ]);
    return {
      ...revisions,
      list: revisions.list.map((revision) => this.toChapterRevision(revision)),
      ...(pointer ? { currentRevisionId: pointer.revisionId } : {}),
      ...(finalPointer ? { currentFinalRevisionId: finalPointer.revisionId } : {}),
    };
  }

  async restoreChapterRevision(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
  ): Promise<StudioChapterRevisionResponse> {
    await this.getOwnedProject(userId, projectId);
    const revision = await this.chapterRevisionService.getById(revisionId);
    if (!revision || revision.projectId !== projectId || revision.chapterNumber !== chapterNumber) {
      throw apiError(CommonErrorCode.NotFound, { message: '章节草稿不存在。' });
    }
    await this.setCurrentDraftPointer(revision);
    return this.toChapterRevision(revision);
  }

  async createAuthorChapterRevision(
    userId: string,
    projectId: string,
    chapterNumber: number,
    sourceRevisionId: string,
    input: CreateStudioAuthorRevision,
  ): Promise<StudioChapterRevisionResponse> {
    const sourceRevision = await this.getOwnedChapterRevision(
      userId,
      projectId,
      chapterNumber,
      sourceRevisionId,
    );
    if (sourceRevision.status === 'SUPERSEDED') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '已被替代的章节版本不能直接编辑，请先恢复为当前草稿。',
      });
    }

    const revision = await this.unitOfWork.execute(async () => {
      const pointer = await this.chapterDraftPointerService.get({
        projectId,
        chapterNumber,
      });
      if (pointer?.revisionId !== sourceRevisionId) {
        throw apiError(CommonErrorCode.BadRequest, {
          message: '请先将要编辑的版本恢复为当前草稿。',
        });
      }
      const { list } = await this.chapterRevisionService.list(
        { projectId, chapterNumber },
        { page: 1, limit: 1, orderBy: { version: 'desc' } },
      );
      const authorRevision = await this.chapterRevisionService.create({
        id: randomUUID(),
        project: { connect: { id: projectId } },
        chapterPlan: { connect: { id: sourceRevision.chapterPlanId } },
        sourceRevision: { connect: { id: sourceRevisionId } },
        chapterNumber,
        version: (list[0]?.version ?? 0) + 1,
        status: 'DRAFT',
        content: input.content,
        wordCount: this.countWords(input.content),
        promptSummary: input.editSummary,
        modelConfig: {},
        source: 'author',
        schemaVersion: 1,
        contentHash: this.hashContent(input.content),
      });
      await this.setCurrentDraftPointer(authorRevision);
      return authorRevision;
    });
    return this.toChapterRevision(revision);
  }

  async finalizeChapterRevision(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
  ): Promise<StudioChapterFinalizationResponse> {
    const revision = await this.getOwnedChapterRevision(
      userId,
      projectId,
      chapterNumber,
      revisionId,
    );
    await this.ensureNoBlockingReviewFindings(projectId, revision);
    const finalization = await this.unitOfWork.execute(async () => {
      const existing = await this.chapterFinalizationService.getByRevisionId(revisionId);
      if (existing) return existing;

      const currentRevision = await this.chapterRevisionService.getById(revisionId);
      if (!this.belongsToChapter(currentRevision, projectId, chapterNumber)) {
        throw apiError(CommonErrorCode.NotFound, { message: '章节草稿不存在。' });
      }
      if (currentRevision.status === 'SUPERSEDED') {
        throw apiError(CommonErrorCode.BadRequest, {
          message: '已被替代的章节版本不能定稿。',
        });
      }

      const [draftPointer, pendingFactChanges, acceptedFactChanges] = await Promise.all([
        this.chapterDraftPointerService.get({ projectId, chapterNumber }),
        this.factChangeService.count({
          projectId,
          chapterNumber,
          revisionId,
          status: 'PROPOSED',
        }),
        this.factChangeService.list(
          {
            projectId,
            chapterNumber,
            revisionId,
            status: 'ACCEPTED_PENDING_FINALIZATION',
          },
          { page: 1, limit: 500, orderBy: { createdAt: 'asc' } },
        ),
      ]);
      if (draftPointer?.revisionId !== revisionId) {
        throw apiError(CommonErrorCode.BadRequest, {
          message: '请先将要定稿的版本恢复为当前草稿。',
        });
      }
      if (pendingFactChanges > 0) {
        throw apiError(CommonErrorCode.BadRequest, {
          message: '请先裁决本章节草稿的全部事实建议。',
        });
      }

      const pendingFinalization = await this.chapterFinalizationService.create({
        project: { connect: { id: projectId } },
        revision: { connect: { id: revisionId } },
        chapterNumber,
        status: 'FINALIZING',
        summaryStatus: 'PENDING',
        indexStatus: 'PENDING',
      });
      await this.applyAcceptedFactChanges(projectId, acceptedFactChanges.list);

      const currentFinalPointer = await this.chapterFinalPointerService.get({
        projectId,
        chapterNumber,
      });
      if (currentFinalPointer && currentFinalPointer.revisionId !== revisionId) {
        await this.chapterRevisionService.update(
          { id: currentFinalPointer.revisionId },
          { status: 'SUPERSEDED' },
        );
      }
      await this.chapterRevisionService.update({ id: revisionId }, { status: 'FINALIZED' });
      await this.chapterFinalPointerService.upsert({
        where: {
          projectId_chapterNumber: { projectId, chapterNumber },
        },
        create: {
          project: { connect: { id: projectId } },
          chapterNumber,
          revision: { connect: { id: revisionId } },
        },
        update: { revision: { connect: { id: revisionId } } },
      });
      await Promise.all(
        (['SUMMARY', 'INDEX'] as const).map((type) =>
          this.finalizationOutboxTaskService.create({
            finalization: { connect: { id: pendingFinalization.id } },
            project: { connect: { id: projectId } },
            revisionId,
            chapterNumber,
            type,
            idempotencyKey: `studio-finalization:${pendingFinalization.id}:${type.toLowerCase()}`,
            payload: { projectId, revisionId, chapterNumber, task: type.toLowerCase() },
          }),
        ),
      );
      return this.chapterFinalizationService.update(
        { id: pendingFinalization.id },
        { status: 'FINALIZED' },
      );
    });
    return this.toChapterFinalization(finalization);
  }

  async compareChapterRevisions(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
    comparisonRevisionId: string,
  ): Promise<StudioChapterRevisionDiff> {
    await this.getOwnedProject(userId, projectId);
    const [baseRevision, comparisonRevision] = await Promise.all([
      this.chapterRevisionService.getById(revisionId),
      this.chapterRevisionService.getById(comparisonRevisionId),
    ]);
    if (
      !this.belongsToChapter(baseRevision, projectId, chapterNumber) ||
      !this.belongsToChapter(comparisonRevision, projectId, chapterNumber)
    ) {
      throw apiError(CommonErrorCode.NotFound, { message: '章节草稿不存在。' });
    }

    return {
      baseRevisionId: baseRevision.id,
      comparisonRevisionId: comparisonRevision.id,
      segments: this.diffRevisionContent(baseRevision.content, comparisonRevision.content),
    };
  }

  async listFactChanges(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
    query: StudioFactChangeListQuery,
  ): Promise<StudioFactChangeListResponse> {
    await this.getOwnedChapterRevision(userId, projectId, chapterNumber, revisionId);
    const changes = await this.factChangeService.list(
      { projectId, chapterNumber, revisionId },
      { page: query.page, limit: query.limit, orderBy: { createdAt: 'desc' } },
    );
    return {
      ...changes,
      list: changes.list.map((change) => this.toFactChange(change)),
    };
  }

  async listFacts(
    userId: string,
    projectId: string,
    query: StudioFactListQuery,
  ): Promise<StudioFactListResponse> {
    await this.getOwnedProject(userId, projectId);
    const facts = await this.factService.list(
      { projectId, status: 'CONFIRMED' },
      { page: query.page, limit: query.limit, orderBy: { createdAt: 'desc' } },
    );
    return {
      ...facts,
      list: facts.list.map((fact) => this.toFact(fact)),
    };
  }

  async createFactChange(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
    input: CreateStudioFactChange,
  ): Promise<StudioFactChangeResponse> {
    await this.getOwnedChapterRevision(userId, projectId, chapterNumber, revisionId);
    await this.validateFactTarget(projectId, input.operation, input.factId);
    const change = await this.factChangeService.create({
      project: { connect: { id: projectId } },
      revision: { connect: { id: revisionId } },
      ...(input.factId ? { targetFact: { connect: { id: input.factId } } } : {}),
      chapterNumber,
      operation: input.operation.toUpperCase() as 'ADD' | 'UPDATE' | 'REMOVE',
      factType: input.factType,
      subject: input.subject,
      predicate: input.predicate,
      proposedValue: input.proposedValue,
      rationale: input.rationale,
      evidence: input.evidence,
      source: 'author',
      status: 'PROPOSED',
    });
    return this.toFactChange(change);
  }

  async resolveFactChange(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
    changeId: string,
    input: ResolveStudioFactChange,
  ): Promise<StudioFactChangeResponse> {
    await this.getOwnedChapterRevision(userId, projectId, chapterNumber, revisionId);
    const change = await this.factChangeService.getById(changeId);
    if (
      !change ||
      change.projectId !== projectId ||
      change.chapterNumber !== chapterNumber ||
      change.revisionId !== revisionId
    ) {
      throw apiError(CommonErrorCode.NotFound, { message: '事实建议不存在。' });
    }
    if (change.status !== 'PROPOSED') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '该事实建议已经裁决。',
      });
    }
    if (input.decision === 'edit' && change.operation !== 'REMOVE' && !input.resolvedValue) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '编辑后必须填写确认的事实值。',
      });
    }
    if (
      input.decision !== 'reject' &&
      change.operation !== 'REMOVE' &&
      !(input.decision === 'edit' ? input.resolvedValue : change.proposedValue)
    ) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '接受事实前必须填写事实值。',
      });
    }

    const resolved = await this.unitOfWork.execute(async () => {
      if (input.decision === 'reject') {
        return this.factChangeService.update(
          { id: change.id },
          { status: 'REJECTED', resolvedAt: new Date() },
        );
      }

      const value = input.decision === 'edit' ? input.resolvedValue! : change.proposedValue;
      return this.factChangeService.update(
        { id: change.id },
        {
          status: 'ACCEPTED_PENDING_FINALIZATION',
          resolvedValue: change.operation === 'REMOVE' ? null : value,
          resolvedAt: new Date(),
        },
      );
    });
    return this.toFactChange(resolved);
  }

  private async getOwnedRun(
    userId: string,
    runId: string,
  ): Promise<{ project: StudioProject; run: StudioGenerationRun }> {
    const run = await this.runService.getById(runId);
    if (!run) {
      throw apiError(CommonErrorCode.NotFound, { message: '创作任务不存在。' });
    }

    const project = await this.projectService.getById(run.projectId);
    if (!project || project.ownerId !== userId) {
      throw apiError(CommonErrorCode.NotFound, { message: '创作任务不存在。' });
    }

    return { project, run };
  }

  private belongsToChapter(
    revision: StudioChapterRevision | null,
    projectId: string,
    chapterNumber: number,
  ): revision is StudioChapterRevision {
    return Boolean(
      revision && revision.projectId === projectId && revision.chapterNumber === chapterNumber,
    );
  }

  private async getOwnedChapterRevision(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
  ): Promise<StudioChapterRevision> {
    await this.getOwnedProject(userId, projectId);
    const revision = await this.chapterRevisionService.getById(revisionId);
    if (!this.belongsToChapter(revision, projectId, chapterNumber)) {
      throw apiError(CommonErrorCode.NotFound, { message: '章节草稿不存在。' });
    }
    return revision;
  }

  private async validateFactTarget(
    projectId: string,
    operation: CreateStudioFactChange['operation'],
    factId?: string,
  ): Promise<void> {
    if (operation === 'add' && factId) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '新增事实不应指定已有事实。',
      });
    }
    if (operation !== 'add' && !factId) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '更新或移除事实必须指定目标事实。',
      });
    }
    if (factId) await this.getOwnedFact(projectId, factId);
  }

  private async getOwnedFact(projectId: string, factId?: string): Promise<StudioFact> {
    if (!factId) {
      throw apiError(CommonErrorCode.BadRequest, { message: '缺少目标事实。' });
    }
    const fact = await this.factService.getById(factId);
    if (!fact || fact.projectId !== projectId || fact.status !== 'CONFIRMED') {
      throw apiError(CommonErrorCode.NotFound, { message: '目标事实不存在。' });
    }
    return fact;
  }

  private async applyAcceptedFactChanges(
    projectId: string,
    changes: StudioFactChange[],
  ): Promise<void> {
    for (const change of changes) {
      const value = change.resolvedValue ?? change.proposedValue;
      if (change.operation === 'ADD') {
        const fact = await this.factService.create({
          project: { connect: { id: projectId } },
          sourceChange: { connect: { id: change.id } },
          factType: change.factType,
          subject: change.subject,
          predicate: change.predicate,
          value,
          effectiveChapter: change.chapterNumber,
          status: 'CONFIRMED',
        });
        await this.factChangeService.update(
          { id: change.id },
          { targetFact: { connect: { id: fact.id } }, status: 'ACCEPTED' },
        );
        continue;
      }

      const fact = await this.getOwnedFact(projectId, change.factId ?? undefined);
      if (change.operation === 'UPDATE') {
        await this.factService.update(
          { id: fact.id },
          {
            factType: change.factType,
            subject: change.subject,
            predicate: change.predicate,
            value,
            effectiveChapter: change.chapterNumber,
            status: 'CONFIRMED',
          },
        );
      } else {
        await this.factService.update(
          { id: fact.id },
          { status: 'RETIRED', effectiveChapter: change.chapterNumber },
        );
      }
      await this.factChangeService.update({ id: change.id }, { status: 'ACCEPTED' });
    }
  }

  private async ensureNoBlockingReviewFindings(
    projectId: string,
    revision: StudioChapterRevision,
  ): Promise<void> {
    const facts = await this.factService.list(
      { projectId, status: 'CONFIRMED' },
      { page: 1, limit: 500, orderBy: { createdAt: 'asc' } },
    );
    if (facts.list.length > 0) {
      const findings = await this.runtimeClient.reviewHardFacts({
        content: revision.content,
        facts: facts.list.map((fact) => ({
          id: fact.id,
          subject: fact.subject,
          predicate: fact.predicate,
          value: fact.value,
        })),
      });
      for (const finding of findings) {
        const findingKey = this.hashContent(
          `${revision.id}:${finding.factId}:${finding.ruleId}:${finding.evidenceStart}:${finding.evidenceEnd}`,
        );
        const existing = await this.reviewFindingService.getByFindingKey(findingKey);
        if (existing) continue;
        await this.reviewFindingService.create({
          findingKey,
          project: { connect: { id: projectId } },
          revision: { connect: { id: revision.id } },
          fact: { connect: { id: finding.factId } },
          chapterNumber: revision.chapterNumber,
          ruleId: finding.ruleId,
          severity: 'BLOCKING',
          status: 'OPEN',
          evidenceStart: finding.evidenceStart,
          evidenceEnd: finding.evidenceEnd,
          evidence: finding.evidence,
          suggestedAction: finding.suggestedAction,
        });
      }
    }
    const blockingCount = await this.reviewFindingService.count({
      projectId,
      revisionId: revision.id,
      severity: 'BLOCKING',
      status: 'OPEN',
    });
    if (blockingCount > 0) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: `定稿前必须处理 ${blockingCount} 个硬事实冲突。`,
      });
    }
  }

  private async getOwnedProject(userId: string, projectId: string): Promise<StudioProject> {
    const project = await this.projectService.getById(projectId);
    if (!project || project.ownerId !== userId) {
      throw apiError(CommonErrorCode.NotFound, { message: '创作项目不存在。' });
    }

    return project;
  }

  private async getConfirmedBlueprint(project: StudioProject): Promise<StudioBlueprint> {
    if (!project.currentBlueprintId) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先确认创作蓝图。',
      });
    }
    const blueprint = await this.blueprintService.getById(project.currentBlueprintId);
    if (!blueprint || blueprint.status !== 'CONFIRMED') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先确认创作蓝图。',
      });
    }

    return blueprint;
  }

  private async syncRun(runId: string, runtimeJob: GenerationJob): Promise<StudioGenerationRun> {
    const run = await this.runService.update(
      { id: runId },
      {
        status: dbStatusMap[runtimeJob.status],
        progress: runtimeJob.progress,
        currentStep: runtimeJob.currentStep,
        architecture: runtimeJob.artifact?.architecture ?? null,
        outline: runtimeJob.artifact?.outline ?? null,
        chapterContent: runtimeJob.artifact?.chapterDraft ?? null,
        factChanges: JSON.parse(JSON.stringify(runtimeJob.artifact?.factChanges ?? [])),
        ...(runtimeJob.modelConfig
          ? { modelConfig: JSON.parse(JSON.stringify(runtimeJob.modelConfig)) }
          : {}),
        attemptCount: runtimeJob.attemptCount,
        error: runtimeJob.error ?? null,
      },
    );
    if (run.status === 'SUCCEEDED' && run.type === 'BLUEPRINT' && run.architecture) {
      await this.createBlueprintFromRun(run);
    }
    if (run.status === 'SUCCEEDED' && run.type === 'CHAPTER_DRAFT' && run.chapterContent) {
      await this.createChapterRevisionFromRun(run);
    }
    return run;
  }

  private async createBlueprintFromRun(run: StudioGenerationRun): Promise<void> {
    const existing = await this.blueprintService.get({ runId: run.id });
    if (existing) return;

    const latest = await this.findLatestBlueprint(run.projectId);
    const architecture = run.architecture!;
    const outline = run.outline ?? '';
    await this.blueprintService.create({
      project: { connect: { id: run.projectId } },
      sourceRun: { connect: { id: run.id } },
      version: (latest?.version ?? 0) + 1,
      status: 'DRAFT',
      architecture,
      outline,
      source: 'ai',
      schemaVersion: 1,
      contentHash: this.hashBlueprint(architecture, outline),
    });
  }

  private async createChapterRevisionFromRun(run: StudioGenerationRun): Promise<void> {
    const existing = await this.chapterRevisionService.getById(run.id);
    if (existing) {
      await this.createAiFactChangesFromRun(existing, run);
      return;
    }
    if (!run.chapterPlanId || !run.chapterContent) return;

    const plan = await this.chapterPlanService.getById(run.chapterPlanId);
    if (!plan) return;
    const { list } = await this.chapterRevisionService.list(
      { projectId: run.projectId, chapterNumber: plan.chapterNumber },
      { page: 1, limit: 1, orderBy: { version: 'desc' } },
    );
    const revision = await this.chapterRevisionService.create({
      id: run.id,
      project: { connect: { id: run.projectId } },
      chapterPlan: { connect: { id: plan.id } },
      sourceRun: { connect: { id: run.id } },
      chapterNumber: plan.chapterNumber,
      version: (list[0]?.version ?? 0) + 1,
      status: 'DRAFT',
      content: run.chapterContent,
      wordCount: this.countWords(run.chapterContent),
      promptSummary: run.inputSummary ?? '',
      modelConfig: JSON.parse(JSON.stringify(run.modelConfig)),
      source: 'ai',
      schemaVersion: 1,
      contentHash: this.hashContent(run.chapterContent),
    });
    await this.setCurrentDraftPointer(revision);
    await this.createAiFactChangesFromRun(revision, run);
  }

  private async createAiFactChangesFromRun(
    revision: StudioChapterRevision,
    run: StudioGenerationRun,
  ): Promise<void> {
    const proposals = this.factProposalsFromRun(run.factChanges);
    if (proposals.length === 0) return;
    const existing = await this.factChangeService.list(
      { revisionId: revision.id, source: 'ai' },
      { page: 1, limit: 1 },
    );
    if (existing.total > 0) return;

    await Promise.all(
      proposals.map((proposal) =>
        this.factChangeService.create({
          project: { connect: { id: revision.projectId } },
          revision: { connect: { id: revision.id } },
          chapterNumber: revision.chapterNumber,
          operation: 'ADD',
          factType: proposal.factType,
          subject: proposal.subject,
          predicate: proposal.predicate,
          proposedValue: proposal.proposedValue,
          rationale: proposal.rationale,
          evidence: proposal.evidence,
          confidence: proposal.confidence,
          source: 'ai',
          status: 'PROPOSED',
        }),
      ),
    );
  }

  private async setCurrentDraftPointer(revision: StudioChapterRevision): Promise<void> {
    await this.chapterDraftPointerService.upsert({
      where: {
        projectId_chapterNumber: {
          projectId: revision.projectId,
          chapterNumber: revision.chapterNumber,
        },
      },
      create: {
        project: { connect: { id: revision.projectId } },
        chapterNumber: revision.chapterNumber,
        revision: { connect: { id: revision.id } },
      },
      update: { revision: { connect: { id: revision.id } } },
    });
  }

  private async findLatestBlueprint(projectId: string): Promise<StudioBlueprint | null> {
    const { list } = await this.blueprintService.list(
      { projectId },
      { page: 1, limit: 1, orderBy: { version: 'desc' } },
    );
    return list[0] ?? null;
  }

  private hashBlueprint(architecture: string, outline: string): string {
    return createHash('sha256').update(`${architecture}\n\n${outline}`, 'utf8').digest('hex');
  }

  private async findLatestChapterPlan(
    projectId: string,
    chapterNumber: number,
  ): Promise<StudioChapterPlan | null> {
    const { list } = await this.chapterPlanService.list(
      { projectId, chapterNumber },
      { page: 1, limit: 1, orderBy: { version: 'desc' } },
    );
    return list[0] ?? null;
  }

  private hashChapterPlan(input: UpdateStudioChapterPlan): string {
    return createHash('sha256').update(JSON.stringify(input), 'utf8').digest('hex');
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  private factProposalsFromRun(raw: unknown): StudioFactProposal[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((proposal): StudioFactProposal[] => {
      if (
        typeof proposal !== 'object' ||
        proposal === null ||
        !('operation' in proposal) ||
        proposal.operation !== 'add' ||
        !('factType' in proposal) ||
        typeof proposal.factType !== 'string' ||
        !('subject' in proposal) ||
        typeof proposal.subject !== 'string' ||
        !('predicate' in proposal) ||
        typeof proposal.predicate !== 'string' ||
        !('proposedValue' in proposal) ||
        typeof proposal.proposedValue !== 'string' ||
        !('rationale' in proposal) ||
        typeof proposal.rationale !== 'string' ||
        !('evidence' in proposal) ||
        typeof proposal.evidence !== 'string'
      ) {
        return [];
      }
      const confidence =
        'confidence' in proposal &&
        typeof proposal.confidence === 'number' &&
        Number.isFinite(proposal.confidence) &&
        proposal.confidence >= 0 &&
        proposal.confidence <= 1
          ? proposal.confidence
          : 0.5;
      return [
        {
          operation: 'add',
          factType: proposal.factType,
          subject: proposal.subject,
          predicate: proposal.predicate,
          proposedValue: proposal.proposedValue,
          rationale: proposal.rationale,
          evidence: proposal.evidence,
          confidence,
        },
      ];
    });
  }

  private countWords(content: string): number {
    return content.trim() ? content.trim().split(/\s+/u).length : 0;
  }

  private diffRevisionContent(
    baseContent: string,
    comparisonContent: string,
  ): StudioChapterRevisionDiff['segments'] {
    const baseLines = this.toDiffLines(baseContent);
    const comparisonLines = this.toDiffLines(comparisonContent);
    if (baseLines.length > MAX_DIFF_LINES || comparisonLines.length > MAX_DIFF_LINES) {
      return this.mergeDiffSegments([
        ...(baseContent ? [{ type: 'removed' as const, text: baseContent }] : []),
        ...(comparisonContent ? [{ type: 'added' as const, text: comparisonContent }] : []),
      ]);
    }

    const matrix = Array.from(
      { length: baseLines.length + 1 },
      () => new Uint16Array(comparisonLines.length + 1),
    );
    for (let baseIndex = baseLines.length - 1; baseIndex >= 0; baseIndex -= 1) {
      for (
        let comparisonIndex = comparisonLines.length - 1;
        comparisonIndex >= 0;
        comparisonIndex -= 1
      ) {
        matrix[baseIndex][comparisonIndex] =
          baseLines[baseIndex] === comparisonLines[comparisonIndex]
            ? matrix[baseIndex + 1][comparisonIndex + 1] + 1
            : Math.max(
                matrix[baseIndex + 1][comparisonIndex],
                matrix[baseIndex][comparisonIndex + 1],
              );
      }
    }

    const segments: StudioChapterRevisionDiff['segments'] = [];
    let baseIndex = 0;
    let comparisonIndex = 0;
    while (baseIndex < baseLines.length || comparisonIndex < comparisonLines.length) {
      if (
        baseIndex < baseLines.length &&
        comparisonIndex < comparisonLines.length &&
        baseLines[baseIndex] === comparisonLines[comparisonIndex]
      ) {
        segments.push({ type: 'unchanged', text: baseLines[baseIndex] });
        baseIndex += 1;
        comparisonIndex += 1;
      } else if (
        comparisonIndex < comparisonLines.length &&
        (baseIndex === baseLines.length ||
          matrix[baseIndex][comparisonIndex + 1] >= matrix[baseIndex + 1][comparisonIndex])
      ) {
        segments.push({ type: 'added', text: comparisonLines[comparisonIndex] });
        comparisonIndex += 1;
      } else {
        segments.push({ type: 'removed', text: baseLines[baseIndex] });
        baseIndex += 1;
      }
    }
    return this.mergeDiffSegments(segments);
  }

  private toDiffLines(content: string): string[] {
    return content.match(/[^\n]*\n|[^\n]+$/gu) ?? [];
  }

  private mergeDiffSegments(
    segments: StudioChapterRevisionDiff['segments'],
  ): StudioChapterRevisionDiff['segments'] {
    return segments.reduce<StudioChapterRevisionDiff['segments']>((merged, segment) => {
      const previous = merged.at(-1);
      if (previous?.type === segment.type) previous.text += segment.text;
      else merged.push({ ...segment });
      return merged;
    }, []);
  }

  private toRuntimeProject(project: StudioProject): CreateStudioProject {
    return {
      title: project.title,
      format: project.format as CreateStudioProject['format'],
      genre: project.genre,
      premise: project.premise,
      chapterCount: project.chapterCount,
      targetWordsPerChapter: project.targetWordsPerChapter,
      guidance: project.guidance,
      generateOutline: project.generateOutline,
    };
  }

  private toGenerationJob(project: StudioProject, run: StudioGenerationRun): GenerationJob {
    const artifact = {
      ...(run.architecture ? { architecture: run.architecture } : {}),
      ...(run.outline ? { outline: run.outline } : {}),
      ...(run.chapterContent ? { chapterDraft: run.chapterContent } : {}),
      ...(this.factProposalsFromRun(run.factChanges).length > 0
        ? { factChanges: this.factProposalsFromRun(run.factChanges) }
        : {}),
    };

    return {
      id: run.id,
      project: {
        id: project.id,
        title: project.title,
        format: project.format as GenerationJob['project']['format'],
        genre: project.genre,
        chapterCount: project.chapterCount,
        targetWordsPerChapter: project.targetWordsPerChapter,
      },
      status: runStatusMap[run.status],
      progress: run.progress,
      currentStep: run.currentStep,
      attemptCount: run.attemptCount,
      ...(Object.keys(artifact).length > 0 ? { artifact } : {}),
      ...(run.type === 'CHAPTER_DRAFT' && run.status === 'SUCCEEDED' ? { revisionId: run.id } : {}),
      ...(run.error ? { error: run.error } : {}),
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
    };
  }

  private toProjectListItem(
    project: ProjectWithLatestRun,
  ): StudioProjectListResponse['list'][number] {
    const latestRun = project.runs[0];

    return {
      id: project.id,
      title: project.title,
      format: project.format as GenerationJob['project']['format'],
      genre: project.genre,
      chapterCount: project.chapterCount,
      targetWordsPerChapter: project.targetWordsPerChapter,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      ...(latestRun
        ? {
            latestRun: {
              id: latestRun.id,
              status: runStatusMap[latestRun.status],
              progress: latestRun.progress,
              currentStep: latestRun.currentStep,
              updatedAt: latestRun.updatedAt.toISOString(),
            },
          }
        : {}),
    };
  }

  private toBlueprint(blueprint: StudioBlueprint): StudioBlueprintResponse {
    return {
      id: blueprint.id,
      projectId: blueprint.projectId,
      ...(blueprint.runId ? { runId: blueprint.runId } : {}),
      version: blueprint.version,
      status: blueprintStatusMap[blueprint.status],
      architecture: blueprint.architecture,
      outline: blueprint.outline,
      source: blueprint.source as StudioBlueprintResponse['source'],
      schemaVersion: blueprint.schemaVersion,
      createdAt: blueprint.createdAt.toISOString(),
      updatedAt: blueprint.updatedAt.toISOString(),
    };
  }

  private toChapterPlan(plan: StudioChapterPlan): StudioChapterPlanResponse {
    return {
      id: plan.id,
      projectId: plan.projectId,
      blueprintId: plan.blueprintId,
      chapterNumber: plan.chapterNumber,
      version: plan.version,
      status: chapterPlanStatusMap[plan.status],
      title: plan.title,
      goal: plan.goal,
      conflict: plan.conflict,
      characters: plan.characters as string[],
      location: plan.location,
      timeConstraint: plan.timeConstraint,
      foreshadowing: plan.foreshadowing,
      hook: plan.hook,
      source: plan.source as StudioChapterPlanResponse['source'],
      schemaVersion: plan.schemaVersion,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  private toChapterRevision(revision: StudioChapterRevision): StudioChapterRevisionResponse {
    return {
      id: revision.id,
      projectId: revision.projectId,
      chapterPlanId: revision.chapterPlanId,
      ...(revision.runId ? { runId: revision.runId } : {}),
      chapterNumber: revision.chapterNumber,
      version: revision.version,
      status: chapterRevisionStatusMap[revision.status],
      content: revision.content,
      wordCount: revision.wordCount,
      promptSummary: revision.promptSummary,
      ...(revision.source === 'author' && revision.promptSummary
        ? { editSummary: revision.promptSummary }
        : {}),
      source: revision.source as StudioChapterRevisionResponse['source'],
      ...(revision.sourceRevisionId ? { sourceRevisionId: revision.sourceRevisionId } : {}),
      schemaVersion: revision.schemaVersion,
      createdAt: revision.createdAt.toISOString(),
      updatedAt: revision.updatedAt.toISOString(),
    };
  }

  private toFactChange(change: StudioFactChange): StudioFactChangeResponse {
    return {
      id: change.id,
      projectId: change.projectId,
      revisionId: change.revisionId,
      chapterNumber: change.chapterNumber,
      ...(change.factId ? { factId: change.factId } : {}),
      operation: change.operation.toLowerCase() as StudioFactChangeResponse['operation'],
      factType: change.factType,
      subject: change.subject,
      predicate: change.predicate,
      proposedValue: change.proposedValue,
      rationale: change.rationale,
      evidence: change.evidence,
      ...(typeof change.confidence === 'number' ? { confidence: change.confidence } : {}),
      source: change.source as StudioFactChangeResponse['source'],
      status: change.status.toLowerCase() as StudioFactChangeResponse['status'],
      ...(change.resolvedValue ? { resolvedValue: change.resolvedValue } : {}),
      ...(change.resolvedAt ? { resolvedAt: change.resolvedAt.toISOString() } : {}),
      createdAt: change.createdAt.toISOString(),
      updatedAt: change.updatedAt.toISOString(),
    };
  }

  private toChapterFinalization(
    finalization: StudioChapterFinalization,
  ): StudioChapterFinalizationResponse {
    return {
      id: finalization.id,
      projectId: finalization.projectId,
      revisionId: finalization.revisionId,
      chapterNumber: finalization.chapterNumber,
      status: 'finalized',
      summaryStatus:
        finalization.summaryStatus.toLowerCase() as StudioChapterFinalizationResponse['summaryStatus'],
      indexStatus:
        finalization.indexStatus.toLowerCase() as StudioChapterFinalizationResponse['indexStatus'],
      finalizedAt: finalization.finalizedAt.toISOString(),
      createdAt: finalization.createdAt.toISOString(),
      updatedAt: finalization.updatedAt.toISOString(),
    };
  }

  private toFact(fact: StudioFact): StudioFactResponse {
    return {
      id: fact.id,
      projectId: fact.projectId,
      factType: fact.factType,
      subject: fact.subject,
      predicate: fact.predicate,
      value: fact.value,
      effectiveChapter: fact.effectiveChapter,
      status: 'confirmed',
      createdAt: fact.createdAt.toISOString(),
      updatedAt: fact.updatedAt.toISOString(),
    };
  }
}
