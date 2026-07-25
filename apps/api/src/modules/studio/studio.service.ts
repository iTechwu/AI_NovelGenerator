import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import * as mammoth from 'mammoth';
import { z } from 'zod';
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
  StudioFinalizationFactSnapshotService,
  StudioReviewFindingService,
  StudioGenerationRunService,
  StudioProjectService,
  StudioProjectImportService,
  StudioProjectEventService,
  StudioAdaptationProjectService,
  StudioAdaptationSourceSnapshotService,
  StudioAdaptationSourceChapterService,
  StudioAdaptationDecisionService,
  StudioScenePlanService,
  StudioSourceSceneMappingService,
  StudioScreenplaySceneRevisionService,
} from '@app/db';
import type {
  StudioBlueprint,
  StudioChapterPlan,
  StudioChapterFinalization,
  StudioChapterRevision,
  StudioFact,
  StudioFactChange,
  StudioFinalizationFactSnapshot,
  StudioReviewFinding,
  StudioGenerationRun,
  StudioProject,
  StudioAdaptationProject,
  StudioAdaptationSourceSnapshot,
  StudioAdaptationSourceChapter,
  StudioAdaptationDecision,
  StudioScenePlan,
  StudioSourceSceneMapping,
  StudioScreenplaySceneRevision,
  Prisma,
} from '@prisma/client';
import { CommonErrorCode } from '@repo/contracts/errors';
import { StudioProjectImportPreviewDataSchema } from '@repo/contracts';
import type {
  CreateStudioProject,
  PreviewStudioProjectImport,
  StudioProjectImportPreview,
  ConfirmStudioProjectImport,
  StudioProjectImportResult,
  StudioProjectImportFactCandidate,
  CreateStudioChapterDraft,
  CreateStudioAuthorRevision,
  GenerationJob,
  StudioBlueprint as StudioBlueprintResponse,
  StudioBlueprintListQuery,
  StudioBlueprintListResponse,
  StudioChapterPlan as StudioChapterPlanResponse,
  StudioChapterRevision as StudioChapterRevisionResponse,
  StudioChapterRevisionListQuery,
  StudioChapterRevisionListResponse,
  StudioChapterRevisionDiff,
  StudioChapterFinalization as StudioChapterFinalizationResponse,
  StudioChapterFinalizationListQuery,
  StudioChapterFinalizationListResponse,
  CreateStudioFactChange,
  ResolveStudioFactChange,
  StudioFactChange as StudioFactChangeResponse,
  StudioFactChangeListQuery,
  StudioFactChangeListResponse,
  StudioFactProposal,
  StudioFact as StudioFactResponse,
  StudioFactListQuery,
  StudioFactListResponse,
  ResolveStudioReviewFinding,
  StudioReviewFinding as StudioReviewFindingResponse,
  StudioReviewFindingListQuery,
  StudioReviewFindingListResponse,
  StudioProjectListQuery,
  StudioProjectListResponse,
  StudioProjectExport,
  StudioProjectExportQuery,
  StudioProjectOverview,
  StudioProjectEvent as StudioProjectEventResponse,
  StudioProjectEventListQuery,
  StudioProjectEventListResponse,
  StudioFinalizationTask as StudioFinalizationTaskResponse,
  StudioFinalizationTaskListQuery,
  StudioFinalizationTaskListResponse,
  UpdateStudioChapterPlan,
  UpdateStudioBlueprint,
  StudioBlueprintRestoreResult,
  StudioChapterFinalRestoreResult,
  CreateStudioAdaptation,
  UpdateStudioAdaptationBrief,
  StudioAdaptationProject as StudioAdaptationProjectResponse,
  StudioAdaptationListQuery,
  StudioAdaptationListResponse,
  StudioAdaptationSourceChapter as StudioAdaptationSourceChapterResponse,
  StudioAdaptationSourceChapterListQuery,
  StudioAdaptationSourceChapterListResponse,
  StudioScenePlan as StudioScenePlanResponse,
  StudioScenePlanSceneOutline,
  SaveStudioScenePlan,
  StudioScenePlanListQuery,
  StudioScenePlanListResponse,
  StudioSourceSceneMapping as StudioSourceSceneMappingResponse,
  CreateStudioSourceSceneMapping,
  ResolveStudioSourceSceneMapping,
  StudioSourceSceneMappingListQuery,
  StudioSourceSceneMappingListResponse,
  StudioScreenplaySceneRevision as StudioScreenplaySceneRevisionResponse,
  CreateStudioScreenplaySceneRevision,
  StudioScreenplaySceneRevisionListQuery,
  StudioScreenplaySceneRevisionListResponse,
  StudioAdaptationExport as StudioAdaptationExportResponse,
  StudioAdaptationExportQuery,
  CreateStudioAdaptationDecision,
  ResolveStudioAdaptationDecision,
  StudioAdaptationDecision as StudioAdaptationDecisionResponse,
  StudioAdaptationDecisionListQuery,
  StudioAdaptationDecisionListResponse,
} from '@repo/contracts';
import { NovelRuntimeClient } from '../../clients/novel-runtime/novel-runtime.client';
import { AuditLogService } from '@app/audit-log';

const runStatusMap = {
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const satisfies Record<StudioGenerationRun['status'], GenerationJob['status']>;

const dbStatusMap = {
  queued: 'QUEUED',
  running: 'RUNNING',
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
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

type ProjectWithLatestRun = StudioProject & {
  runs: StudioGenerationRun[];
  chapterFinalPointers: { id: string }[];
  facts: { id: string }[];
  reviewFindings: { id: string }[];
};
type ImportedChapter = {
  chapterNumber: number;
  title: string;
  content: string;
};

@Injectable()
export class StudioService {
  constructor(
    private readonly runtimeClient: NovelRuntimeClient,
    private readonly projectService: StudioProjectService,
    private readonly projectImportService: StudioProjectImportService,
    private readonly projectEventService: StudioProjectEventService,
    private readonly adaptationProjectService: StudioAdaptationProjectService,
    private readonly adaptationSourceSnapshotService: StudioAdaptationSourceSnapshotService,
    private readonly adaptationSourceChapterService: StudioAdaptationSourceChapterService,
    private readonly adaptationDecisionService: StudioAdaptationDecisionService,
    private readonly scenePlanService: StudioScenePlanService,
    private readonly sourceSceneMappingService: StudioSourceSceneMappingService,
    private readonly screenplayRevisionService: StudioScreenplaySceneRevisionService,
    private readonly runService: StudioGenerationRunService,
    private readonly blueprintService: StudioBlueprintService,
    private readonly chapterPlanService: StudioChapterPlanService,
    private readonly chapterRevisionService: StudioChapterRevisionService,
    private readonly chapterDraftPointerService: StudioChapterDraftPointerService,
    private readonly chapterFinalPointerService: StudioChapterFinalPointerService,
    private readonly chapterFinalizationService: StudioChapterFinalizationService,
    private readonly finalizationOutboxTaskService: StudioFinalizationOutboxTaskService,
    private readonly finalizationFactSnapshotService: StudioFinalizationFactSnapshotService,
    private readonly factService: StudioFactService,
    private readonly reviewFindingService: StudioReviewFindingService,
    private readonly factChangeService: StudioFactChangeService,
    private readonly unitOfWork: UnitOfWorkService,
    private readonly auditLogService: AuditLogService,
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
    await this.projectEventService.create({
      project: { connect: { id: project.id } },
      type: 'GENERATION_STATUS',
      payload: { runId, status: 'queued', progress: 0, currentStep: 'Queued for generation' },
    });
    await this.auditLogService.logCreate('studio.project', project.id, userId, {
      runId,
      title: project.title,
      format: project.format,
      chapterCount: project.chapterCount,
    });

    try {
      const runtimeJob = await this.runtimeClient.createJob(userId, project.id, runId, input);
      const run = await this.syncRun(runId, runtimeJob);
      return this.toGenerationJob(project, run);
    } catch (error) {
      const failedRun = await this.runService.update(
        { id: runId },
        {
          status: 'FAILED',
          progress: 100,
          currentStep: 'Generation service unavailable',
          error: '创作运行时暂时不可用，请稍后重试。',
        },
      );
      await this.projectService.update({ id: project.id }, { updatedAt: failedRun.updatedAt });
      await this.projectEventService.create({
        project: { connect: { id: project.id } },
        type: 'GENERATION_STATUS',
        payload: {
          runId,
          status: 'failed',
          progress: 100,
          currentStep: failedRun.currentStep,
          failureReason: failedRun.error,
        },
      });
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
    if (run.status === 'SUCCEEDED' || run.status === 'FAILED' || run.status === 'CANCELLED') {
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
    if (run.status !== 'FAILED' && run.status !== 'CANCELLED') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '只有失败或已取消的创作任务可以重试。',
      });
    }
    try {
      const runtimeJob = await this.runtimeClient.retryJob(userId, jobId);
      const syncedRun = await this.syncRun(jobId, runtimeJob);
      await this.auditLogService.logUpdate(
        'studio.generation_run',
        jobId,
        userId,
        { action: 'retry' },
        { projectId: project.id },
      );
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

  async cancelJob(userId: string, jobId: string): Promise<GenerationJob> {
    const { project, run } = await this.getOwnedRun(userId, jobId);
    if (run.status === 'SUCCEEDED' || run.status === 'FAILED' || run.status === 'CANCELLED') {
      return this.toGenerationJob(project, run);
    }
    try {
      const runtimeJob = await this.runtimeClient.cancelJob(userId, jobId);
      const syncedRun = await this.syncRun(jobId, runtimeJob);
      await this.auditLogService.logUpdate(
        'studio.generation_run',
        jobId,
        userId,
        { action: 'cancel' },
        { projectId: project.id },
      );
      return this.toGenerationJob(project, syncedRun);
    } catch (error) {
      this.logger.error('Studio run cancellation failed', {
        projectId: project.id,
        runId: jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw apiError(CommonErrorCode.InternalServerError, {
        message: '创作任务暂时无法取消，请稍后重试。',
      });
    }
  }

  async syncActiveGenerationRuns(): Promise<void> {
    const pageSize = 100;
    const activeRuns: Array<StudioGenerationRun & { project: { ownerId: string } }> = [];
    for (let page = 1; ; page += 1) {
      const result = await this.runService.list(
        { status: { in: ['QUEUED', 'RUNNING'] } },
        { page, limit: pageSize, orderBy: { updatedAt: 'asc' } },
        { include: { project: { select: { ownerId: true } } } },
      );
      activeRuns.push(
        ...(result.list as Array<StudioGenerationRun & { project: { ownerId: string } }>),
      );
      if (result.list.length < pageSize || activeRuns.length >= result.total) break;
    }

    for (const run of activeRuns) {
      try {
        const runtimeJob = await this.runtimeClient.getJob(run.project.ownerId, run.id);
        await this.syncRun(run.id, runtimeJob);
      } catch (error) {
        this.logger.warn('Studio generation run sync failed', {
          runId: run.id,
          projectId: run.projectId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  async listProjects(
    userId: string,
    query: StudioProjectListQuery,
  ): Promise<StudioProjectListResponse> {
    const result = await this.projectService.list(
      { ownerId: userId },
      { page: query.page, limit: query.limit, orderBy: { updatedAt: 'desc' } },
      {
        include: {
          runs: { orderBy: { createdAt: 'desc' }, take: 1 },
          chapterFinalPointers: { select: { id: true } },
          facts: { where: { status: 'CONFIRMED' }, select: { id: true } },
          reviewFindings: {
            where: { severity: 'BLOCKING', status: 'OPEN' },
            select: { id: true },
          },
        },
      },
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

  async listAdaptations(
    userId: string,
    projectId: string,
    query: StudioAdaptationListQuery,
  ): Promise<StudioAdaptationListResponse> {
    await this.getOwnedProject(userId, projectId);
    const adaptations = await this.adaptationProjectService.list(
      { ownerId: userId, sourceProjectId: projectId },
      { page: query.page, limit: query.limit, orderBy: { updatedAt: 'desc' } },
    );
    const snapshots = await Promise.all(
      adaptations.list.map((adaptation) =>
        this.adaptationSourceSnapshotService.get({ adaptationId: adaptation.id }),
      ),
    );

    return {
      ...adaptations,
      list: adaptations.list.map((adaptation, index) => {
        const snapshot = snapshots[index];
        if (!snapshot) {
          throw apiError(CommonErrorCode.InternalServerError, {
            message: '改编来源快照缺失，请联系支持人员。',
          });
        }
        return this.toAdaptation(adaptation, snapshot);
      }),
    };
  }

  async createAdaptation(
    userId: string,
    projectId: string,
    input: CreateStudioAdaptation,
  ): Promise<StudioAdaptationProjectResponse> {
    const sourceProject = await this.getOwnedProject(userId, projectId);
    if (sourceProject.format !== 'novel') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '只有小说作品可以创建剧本改编项目。',
      });
    }

    const pointers = await this.chapterFinalPointerService.list(
      { projectId },
      { page: 1, limit: sourceProject.chapterCount, orderBy: { chapterNumber: 'asc' } },
    );
    if (pointers.total === 0) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请至少定稿一章小说后再开始改编。',
      });
    }

    const sourceChapters = await Promise.all(
      pointers.list.map(async (pointer) => {
        const revision = await this.chapterRevisionService.getById(pointer.revisionId);
        if (
          !revision ||
          revision.projectId !== projectId ||
          revision.chapterNumber !== pointer.chapterNumber ||
          revision.status !== 'FINALIZED'
        ) {
          throw apiError(CommonErrorCode.BadRequest, {
            message: '定稿章节状态已变化，请刷新后重试。',
          });
        }
        const chapterPlan = await this.chapterPlanService.getById(revision.chapterPlanId);
        if (
          !chapterPlan ||
          chapterPlan.projectId !== projectId ||
          chapterPlan.chapterNumber !== pointer.chapterNumber
        ) {
          throw apiError(CommonErrorCode.BadRequest, {
            message: '定稿章节计划已变化，请刷新后重试。',
          });
        }
        return { revision, title: chapterPlan.title };
      }),
    );

    const { adaptation, snapshot } = await this.unitOfWork.execute(async () => {
      const adaptation = await this.adaptationProjectService.create({
        ownerId: userId,
        sourceProject: { connect: { id: projectId } },
        targetFormat: input.targetFormat === 'short_drama' ? 'SHORT_DRAMA' : 'SERIES',
        episodeCount: input.episodeCount,
        minutesPerEpisode: input.minutesPerEpisode,
        targetAudience: input.targetAudience,
        adaptationGoal: input.adaptationGoal,
        mustPreserve: input.mustPreserve,
        rightsConfirmedAt: new Date(),
        status: 'BRIEF_DRAFT',
      });
      const snapshot = await this.adaptationSourceSnapshotService.create({
        adaptation: { connect: { id: adaptation.id } },
        sourceProject: { connect: { id: projectId } },
        sourceProjectTitle: sourceProject.title,
        sourceProjectUpdatedAt: sourceProject.updatedAt,
        sourceChapterCount: sourceChapters.length,
      });
      await this.adaptationSourceChapterService.createMany(
        sourceChapters.map(({ revision, title }) => ({
          snapshotId: snapshot.id,
          sourceRevisionId: revision.id,
          chapterNumber: revision.chapterNumber,
          title,
          content: revision.content,
          contentHash: revision.contentHash,
          wordCount: revision.wordCount,
        })),
      );
      return { adaptation, snapshot };
    });

    await this.auditLogService.logCreate('studio.adaptation', adaptation.id, userId, {
      sourceProjectId: projectId,
      sourceSnapshotId: snapshot.id,
      sourceChapterCount: sourceChapters.length,
      targetFormat: input.targetFormat,
      episodeCount: input.episodeCount,
    });
    return this.toAdaptation(adaptation, snapshot);
  }

  async updateAdaptationBrief(
    userId: string,
    adaptationId: string,
    input: UpdateStudioAdaptationBrief,
  ): Promise<StudioAdaptationProjectResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    if (adaptation.status !== 'BRIEF_DRAFT') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '已确认的改编简报不能直接修改，请在改编蓝图中创建修订。',
      });
    }
    const updated = await this.adaptationProjectService.update(
      { id: adaptationId },
      {
        targetFormat: input.targetFormat === 'short_drama' ? 'SHORT_DRAMA' : 'SERIES',
        episodeCount: input.episodeCount,
        minutesPerEpisode: input.minutesPerEpisode,
        targetAudience: input.targetAudience,
        adaptationGoal: input.adaptationGoal,
        mustPreserve: input.mustPreserve,
      },
    );
    const snapshot = await this.getAdaptationSnapshot(adaptationId);
    await this.auditLogService.logUpdate(
      'studio.adaptation_brief',
      adaptationId,
      userId,
      { status: 'brief_draft' },
      { sourceProjectId: adaptation.sourceProjectId },
    );
    return this.toAdaptation(updated, snapshot);
  }

  async confirmAdaptationBrief(
    userId: string,
    adaptationId: string,
  ): Promise<StudioAdaptationProjectResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    if (adaptation.status !== 'BRIEF_DRAFT') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '该改编简报已经确认。',
      });
    }
    if (
      adaptation.targetAudience.trim().length === 0 ||
      adaptation.adaptationGoal.trim().length < 20 ||
      adaptation.mustPreserve.trim().length === 0
    ) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '确认简报前请填写目标观众、至少 20 字的改编目标和必须保留内容。',
      });
    }
    const updated = await this.adaptationProjectService.update(
      { id: adaptationId },
      { status: 'BLUEPRINT_REVIEW' },
    );
    const snapshot = await this.getAdaptationSnapshot(adaptationId);
    await this.auditLogService.logUpdate(
      'studio.adaptation_brief',
      adaptationId,
      userId,
      { status: 'blueprint_review' },
      { sourceProjectId: adaptation.sourceProjectId, action: 'confirm' },
    );
    return this.toAdaptation(updated, snapshot);
  }

  async listAdaptationDecisions(
    userId: string,
    adaptationId: string,
    query: StudioAdaptationDecisionListQuery,
  ): Promise<StudioAdaptationDecisionListResponse> {
    await this.getOwnedAdaptation(userId, adaptationId);
    const decisions = await this.adaptationDecisionService.list(
      { adaptationId },
      { page: query.page, limit: query.limit, orderBy: { createdAt: 'desc' } },
    );
    const chapters = await Promise.all(
      decisions.list.map((decision) =>
        this.adaptationSourceChapterService.getById(decision.sourceChapterId),
      ),
    );

    return {
      ...decisions,
      list: decisions.list.map((decision, index) => {
        const chapter = chapters[index];
        if (!chapter) {
          throw apiError(CommonErrorCode.InternalServerError, {
            message: '改编取舍的来源章节缺失，请联系支持人员。',
          });
        }
        return this.toAdaptationDecision(decision, chapter);
      }),
    };
  }

  async createAdaptationDecision(
    userId: string,
    adaptationId: string,
    input: CreateStudioAdaptationDecision,
  ): Promise<StudioAdaptationDecisionResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    if (adaptation.status !== 'BLUEPRINT_REVIEW') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先确认改编简报，再在改编蓝图中记录取舍。',
      });
    }
    const snapshot = await this.getAdaptationSnapshot(adaptationId);
    const sourceChapter = await this.adaptationSourceChapterService.getById(input.sourceChapterId);
    if (!sourceChapter || sourceChapter.snapshotId !== snapshot.id) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '取舍必须锚定当前改编来源快照中的章节。',
      });
    }
    const decision = await this.adaptationDecisionService.create({
      adaptation: { connect: { id: adaptationId } },
      snapshot: { connect: { id: snapshot.id } },
      sourceChapter: { connect: { id: sourceChapter.id } },
      type: this.toAdaptationDecisionType(input.type),
      impact: input.impact.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
      proposal: input.proposal,
      rationale: input.rationale,
      status: 'PROPOSED',
    });
    await this.auditLogService.logCreate('studio.adaptation_decision', decision.id, userId, {
      adaptationId,
      sourceSnapshotId: snapshot.id,
      sourceChapterId: sourceChapter.id,
      type: input.type,
      impact: input.impact,
    });
    return this.toAdaptationDecision(decision, sourceChapter);
  }

  async resolveAdaptationDecision(
    userId: string,
    adaptationId: string,
    decisionId: string,
    input: ResolveStudioAdaptationDecision,
  ): Promise<StudioAdaptationDecisionResponse> {
    await this.getOwnedAdaptation(userId, adaptationId);
    const decision = await this.adaptationDecisionService.getById(decisionId);
    if (!decision || decision.adaptationId !== adaptationId) {
      throw apiError(CommonErrorCode.NotFound, { message: '改编取舍不存在。' });
    }
    if (decision.status !== 'PROPOSED') {
      throw apiError(CommonErrorCode.BadRequest, { message: '该改编取舍已经处理。' });
    }
    const sourceChapter = await this.adaptationSourceChapterService.getById(decision.sourceChapterId);
    if (!sourceChapter || sourceChapter.snapshotId !== decision.snapshotId) {
      throw apiError(CommonErrorCode.InternalServerError, {
        message: '改编取舍的来源章节缺失，请联系支持人员。',
      });
    }
    const updated = await this.adaptationDecisionService.update(
      { id: decisionId },
      {
        status: input.outcome.toUpperCase() as 'ACCEPTED' | 'EDITED' | 'REJECTED',
        resolutionReason: input.resolutionReason,
        resolvedAt: new Date(),
      },
    );
    await this.auditLogService.logUpdate(
      'studio.adaptation_decision',
      decisionId,
      userId,
      { status: input.outcome },
      { adaptationId, sourceChapterId: sourceChapter.id },
    );
    return this.toAdaptationDecision(updated, sourceChapter);
  }

  async listAdaptationSourceChapters(
    userId: string,
    adaptationId: string,
    query: StudioAdaptationSourceChapterListQuery,
  ): Promise<StudioAdaptationSourceChapterListResponse> {
    await this.getOwnedAdaptation(userId, adaptationId);
    const snapshot = await this.getAdaptationSnapshot(adaptationId);
    const chapters = await this.adaptationSourceChapterService.list(
      { snapshotId: snapshot.id },
      { page: query.page, limit: query.limit, orderBy: { chapterNumber: 'asc' } },
    );

    return {
      ...chapters,
      list: chapters.list.map((chapter) => this.toAdaptationSourceChapter(chapter)),
    };
  }

  async startScenePlanning(
    userId: string,
    adaptationId: string,
  ): Promise<StudioAdaptationProjectResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    if (adaptation.status !== 'BLUEPRINT_REVIEW') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先完成改编简报与蓝图审阅，再进入场景计划。',
      });
    }
    // PRD P13: unresolved high-impact decisions block scene confirmation.
    // We gate the transition itself so authors cannot plan scenes on top of
    // undecided major cuts/merges.
    const unresolvedHighImpact = await this.adaptationDecisionService.count({
      adaptationId,
      impact: 'HIGH',
      status: 'PROPOSED',
    });
    if (unresolvedHighImpact > 0) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '仍有高影响取舍未处理，请先在改编蓝图中逐条裁决。',
      });
    }
    const updated = await this.adaptationProjectService.update(
      { id: adaptationId },
      { status: 'SCENE_PLANNING' },
    );
    await this.auditLogService.logUpdate('studio.adaptation_project', adaptationId, userId, {
      status: 'scene_planning',
    });
    return this.toAdaptation(updated, await this.getAdaptationSnapshot(adaptationId));
  }

  async startScriptWriting(
    userId: string,
    adaptationId: string,
  ): Promise<StudioAdaptationProjectResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    if (adaptation.status !== 'SCENE_PLANNING') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先进入并完成场景计划，再开始剧本生成。',
      });
    }
    // PRD P13: screenplay is written per confirmed scene plan. Require at least
    // one confirmed plan before entering script_writing so authors do not draft
    // screenplay against an unconfirmed outline.
    const confirmedPlanCount = await this.scenePlanService.count({
      adaptationId,
      confirmedAt: { not: null },
    });
    if (confirmedPlanCount === 0) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先确认至少一集场景计划，再进入剧本生成。',
      });
    }
    const updated = await this.adaptationProjectService.update(
      { id: adaptationId },
      { status: 'SCRIPT_WRITING' },
    );
    await this.auditLogService.logUpdate('studio.adaptation_project', adaptationId, userId, {
      status: 'script_writing',
    });
    return this.toAdaptation(updated, await this.getAdaptationSnapshot(adaptationId));
  }

  async listScenePlans(
    userId: string,
    adaptationId: string,
    query: StudioScenePlanListQuery,
  ): Promise<StudioScenePlanListResponse> {
    await this.getOwnedAdaptation(userId, adaptationId);
    const plans = await this.scenePlanService.list(
      { adaptationId },
      { page: query.page, limit: query.limit, orderBy: { episodeNumber: 'asc' } },
    );
    return {
      ...plans,
      list: plans.list.map((plan) => this.toScenePlan(plan)),
    };
  }

  async saveScenePlan(
    userId: string,
    adaptationId: string,
    episodeNumber: number,
    input: SaveStudioScenePlan,
  ): Promise<StudioScenePlanResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    if (adaptation.status !== 'SCENE_PLANNING') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先进入场景计划阶段，再编辑场景表。',
      });
    }
    const sceneOutline = input.sceneOutline as unknown as Prisma.InputJsonValue;
    const existing = await this.scenePlanService.get({ adaptationId, episodeNumber });
    if (existing) {
      // Editing a confirmed plan reopens it: clear confirmation and any stale
      // needs-review flag so the author re-confirms the new outline.
      const updated = await this.scenePlanService.update(
        { id: existing.id },
        {
          title: input.title,
          synopsis: input.synopsis,
          sceneOutline,
          needsReview: false,
          confirmedAt: null,
        },
      );
      return this.toScenePlan(updated);
    }
    const created = await this.scenePlanService.create({
      adaptation: { connect: { id: adaptationId } },
      episodeNumber,
      title: input.title,
      synopsis: input.synopsis,
      sceneOutline,
    });
    await this.auditLogService.logCreate('studio.scene_plan', created.id, userId, {
      adaptationId,
      episodeNumber,
    });
    return this.toScenePlan(created);
  }

  async confirmScenePlan(
    userId: string,
    adaptationId: string,
    episodeNumber: number,
  ): Promise<StudioScenePlanResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    if (adaptation.status !== 'SCENE_PLANNING') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先进入场景计划阶段，再确认场景表。',
      });
    }
    const plan = await this.scenePlanService.get({ adaptationId, episodeNumber });
    if (!plan) {
      throw apiError(CommonErrorCode.NotFound, { message: '场景计划不存在。' });
    }
    if (plan.needsReview) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '该场景计划因上游取舍或来源变更需先复核，暂不可确认。',
      });
    }
    const updated = await this.scenePlanService.update(
      { id: plan.id },
      { confirmedAt: new Date() },
    );
    return this.toScenePlan(updated);
  }

  async listSourceSceneMappings(
    userId: string,
    adaptationId: string,
    query: StudioSourceSceneMappingListQuery,
  ): Promise<StudioSourceSceneMappingListResponse> {
    await this.getOwnedAdaptation(userId, adaptationId);
    const where: Prisma.StudioSourceSceneMappingWhereInput = { adaptationId };
    if (query.episodeNumber) where.episodeNumber = query.episodeNumber;
    const mappings = await this.sourceSceneMappingService.list(
      where,
      { page: query.page, limit: query.limit, orderBy: { createdAt: 'desc' } },
    );
    const chapters = await Promise.all(
      mappings.list.map((mapping) =>
        this.adaptationSourceChapterService.getById(mapping.sourceChapterId),
      ),
    );

    return {
      ...mappings,
      list: mappings.list.map((mapping, index) => {
        const chapter = chapters[index];
        if (!chapter) {
          throw apiError(CommonErrorCode.InternalServerError, {
            message: '改编来源章节缺失，请联系支持人员。',
          });
        }
        return this.toSourceSceneMapping(mapping, chapter);
      }),
    };
  }

  async createSourceSceneMapping(
    userId: string,
    adaptationId: string,
    input: CreateStudioSourceSceneMapping,
  ): Promise<StudioSourceSceneMappingResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    if (adaptation.status === 'BRIEF_DRAFT' || adaptation.status === 'BLUEPRINT_REVIEW') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先进入场景计划阶段，再建立场景溯源。',
      });
    }
    const snapshot = await this.getAdaptationSnapshot(adaptationId);
    const sourceChapter = await this.adaptationSourceChapterService.getById(input.sourceChapterId);
    if (!sourceChapter || sourceChapter.snapshotId !== snapshot.id) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '场景溯源必须锚定当前改编来源快照中的章节。',
      });
    }
    const scenePlan = await this.scenePlanService.get({
      adaptationId,
      episodeNumber: input.episodeNumber,
    });
    if (!scenePlan) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '该集场景计划不存在，请先保存本集计划。',
      });
    }
    const outline = (scenePlan.sceneOutline ?? []) as StudioScenePlanSceneOutline;
    const sceneExists = outline.some((scene) => scene.sceneNumber === input.sceneNumber);
    if (!sceneExists) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '该集不存在此场景编号，请核对场景表后再建立溯源。',
      });
    }
    const mapping = await this.sourceSceneMappingService.create({
      adaptation: { connect: { id: adaptationId } },
      scenePlan: { connect: { id: scenePlan.id } },
      episodeNumber: input.episodeNumber,
      sceneNumber: input.sceneNumber,
      sourceChapter: { connect: { id: sourceChapter.id } },
      evidenceAnchor: input.evidenceAnchor ?? null,
      status: 'PROPOSED',
    });
    await this.auditLogService.logCreate('studio.source_scene_mapping', mapping.id, userId, {
      adaptationId,
      scenePlanId: scenePlan.id,
      episodeNumber: input.episodeNumber,
      sceneNumber: input.sceneNumber,
      sourceChapterId: sourceChapter.id,
    });
    return this.toSourceSceneMapping(mapping, sourceChapter);
  }

  async resolveSourceSceneMapping(
    userId: string,
    adaptationId: string,
    mappingId: string,
    input: ResolveStudioSourceSceneMapping,
  ): Promise<StudioSourceSceneMappingResponse> {
    await this.getOwnedAdaptation(userId, adaptationId);
    const mapping = await this.sourceSceneMappingService.getById(mappingId);
    if (!mapping || mapping.adaptationId !== adaptationId) {
      throw apiError(CommonErrorCode.NotFound, { message: '场景溯源不存在。' });
    }
    const sourceChapter = await this.adaptationSourceChapterService.getById(mapping.sourceChapterId);
    if (!sourceChapter) {
      throw apiError(CommonErrorCode.InternalServerError, {
        message: '改编来源章节缺失，请联系支持人员。',
      });
    }
    const updated = await this.sourceSceneMappingService.update(
      { id: mappingId },
      { status: input.status.toUpperCase() as 'CONFIRMED' | 'STALE' },
    );
    await this.auditLogService.logUpdate(
      'studio.source_scene_mapping',
      mappingId,
      userId,
      { status: input.status },
      { adaptationId, sourceChapterId: sourceChapter.id },
    );
    return this.toSourceSceneMapping(updated, sourceChapter);
  }

  async listScreenplaySceneRevisions(
    userId: string,
    adaptationId: string,
    query: StudioScreenplaySceneRevisionListQuery,
  ): Promise<StudioScreenplaySceneRevisionListResponse> {
    await this.getOwnedAdaptation(userId, adaptationId);
    const where: Prisma.StudioScreenplaySceneRevisionWhereInput = { adaptationId };
    if (query.episodeNumber) where.episodeNumber = query.episodeNumber;
    if (query.sceneNumber) where.sceneNumber = query.sceneNumber;
    const revisions = await this.screenplayRevisionService.list(
      where,
      {
        page: query.page,
        limit: query.limit,
        orderBy: [
          { episodeNumber: 'asc' },
          { sceneNumber: 'asc' },
          { version: 'desc' },
        ],
      },
    );
    return {
      ...revisions,
      list: revisions.list.map((revision) => this.toScreenplaySceneRevision(revision)),
    };
  }

  async createScreenplaySceneRevision(
    userId: string,
    adaptationId: string,
    input: CreateStudioScreenplaySceneRevision,
  ): Promise<StudioScreenplaySceneRevisionResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    if (adaptation.status === 'BRIEF_DRAFT' || adaptation.status === 'BLUEPRINT_REVIEW') {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '请先进入场景计划并规划场景，再编写场景剧本。',
      });
    }
    const scenePlan = await this.scenePlanService.get({
      adaptationId,
      episodeNumber: input.episodeNumber,
    });
    if (!scenePlan) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '该集场景计划不存在，请先保存本集计划。',
      });
    }
    const outline = (scenePlan.sceneOutline ?? []) as StudioScenePlanSceneOutline;
    const sceneExists = outline.some((scene) => scene.sceneNumber === input.sceneNumber);
    if (!sceneExists) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '该集不存在此场景编号，无法编写场景剧本。',
      });
    }
    // Immutable, append-only: every save is a new version. The latest version
    // for the scene is max(existing); we never mutate a prior revision.
    const { list } = await this.screenplayRevisionService.list(
      { scenePlanId: scenePlan.id, sceneNumber: input.sceneNumber },
      { page: 1, limit: 1, orderBy: { version: 'desc' } },
    );
    const revision = await this.screenplayRevisionService.create({
      adaptation: { connect: { id: adaptationId } },
      scenePlan: { connect: { id: scenePlan.id } },
      episodeNumber: input.episodeNumber,
      sceneNumber: input.sceneNumber,
      source: 'AUTHOR',
      sourceRevisionId: input.sourceRevisionId ?? null,
      version: (list[0]?.version ?? 0) + 1,
      content: input.content,
      contentHash: this.hashContent(input.content),
      wordCount: this.countWords(input.content),
      editSummary: input.editSummary ?? null,
    });
    await this.auditLogService.logCreate(
      'studio.screenplay_scene_revision',
      revision.id,
      userId,
      {
        adaptationId,
        scenePlanId: scenePlan.id,
        episodeNumber: input.episodeNumber,
        sceneNumber: input.sceneNumber,
        version: revision.version,
      },
    );
    return this.toScreenplaySceneRevision(revision);
  }

  async exportAdaptation(
    userId: string,
    adaptationId: string,
    query: StudioAdaptationExportQuery,
  ): Promise<StudioAdaptationExportResponse> {
    const adaptation = await this.getOwnedAdaptation(userId, adaptationId);
    const snapshot = await this.getAdaptationSnapshot(adaptationId);
    const plans = await this.scenePlanService.list(
      { adaptationId, confirmedAt: { not: null } },
      { page: 1, limit: 200, orderBy: { episodeNumber: 'asc' } },
    );
    if (plans.list.length === 0) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '没有已确认的场景计划，无法导出剧本。',
      });
    }
    // For each confirmed plan, resolve the latest screenplay revision per scene.
    const episodes = await Promise.all(
      plans.list.map(async (plan) => {
        const outline = (plan.sceneOutline ?? []) as StudioScenePlanSceneOutline;
        const scenes = await Promise.all(
          outline.map(async (scene) => {
            const { list } = await this.screenplayRevisionService.list(
              { scenePlanId: plan.id, sceneNumber: scene.sceneNumber },
              { page: 1, limit: 1, orderBy: { version: 'desc' } },
            );
            return {
              sceneNumber: scene.sceneNumber,
              title: scene.title,
              revision: list[0] ?? null,
            };
          }),
        );
        return {
          episodeNumber: plan.episodeNumber,
          title: plan.title,
          synopsis: plan.synopsis,
          scenes,
        };
      }),
    );

    const unwrittenSceneCount = episodes.reduce(
      (sum, ep) => sum + ep.scenes.filter((scene) => !scene.revision).length,
      0,
    );
    const warnings: string[] = [];
    if (unwrittenSceneCount > 0) {
      warnings.push(`含 ${unwrittenSceneCount} 个尚未编写场景剧本的场景。`);
    }

    const credit =
      adaptation.targetFormat === 'SERIES' ? '剧集改编剧本' : '短剧改编剧本';
    const content =
      query.format === 'fountain'
        ? [
            `Title: ${snapshot.sourceProjectTitle}`,
            `Credit: ${credit}`,
            '',
            '==',
            '',
            ...episodes.flatMap((episode) => [
              `# 第 ${episode.episodeNumber} 集 · ${episode.title}`,
              ...(episode.synopsis ? [`> ${episode.synopsis}`, ''] : []),
              ...episode.scenes.flatMap((scene) => [
                scene.revision
                  ? scene.revision.content
                  : `# 场景 ${scene.sceneNumber} · ${scene.title}（尚未编写）`,
                '',
              ]),
            ]),
          ].join('\n')
        : [
            `${snapshot.sourceProjectTitle} · ${credit}`,
            `来源快照：${snapshot.sourceChapterCount} 章`,
            '',
            ...episodes.flatMap((episode) => [
              `第 ${episode.episodeNumber} 集 · ${episode.title}`,
              episode.synopsis,
              '',
              ...episode.scenes.flatMap((scene) => [
                `【场景 ${scene.sceneNumber} · ${scene.title}】`,
                scene.revision
                  ? scene.revision.content
                  : '（尚未编写场景剧本）',
                '',
              ]),
            ]),
          ].join('\n');

    await this.auditLogService.logExport('studio.adaptation_project', userId, {
      adaptationId,
      format: query.format,
      episodeCount: episodes.length,
      warnings,
    });

    return {
      filename: `${this.safeExportFilename(snapshot.sourceProjectTitle)}-screenplay.${query.format === 'fountain' ? 'fountain' : 'txt'}`,
      contentType: 'text/plain',
      content,
      sourceSnapshotId: snapshot.id,
      episodeCount: episodes.length,
      warnings,
    };
  }

  async previewProjectImport(
    userId: string,
    input: PreviewStudioProjectImport,
  ): Promise<StudioProjectImportPreview> {
    const parsed = await this.parseImportedManuscript(input);
    const factCandidates = this.importFactCandidates(parsed.chapters);
    const imported = await this.projectImportService.create({
      ownerId: userId,
      filename: input.filename,
      sourceFormat: parsed.sourceFormat,
      sourceContentBase64: input.contentBase64,
      contentHash: parsed.contentHash,
      preview: {
        chapters: parsed.chapters.map((chapter) => ({
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          characterCount: chapter.content.length,
          excerpt: this.importExcerpt(chapter.content),
        })),
        factCandidates,
        acceptedFactCandidateIds: [],
      },
    });
    return {
      importId: imported.id,
      filename: imported.filename,
      sourceFormat: parsed.sourceFormat,
      contentHash: parsed.contentHash,
      chapters: parsed.chapters.map((chapter) => ({
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        characterCount: chapter.content.length,
        excerpt: this.importExcerpt(chapter.content),
      })),
      factCandidates,
    };
  }

  async confirmProjectImport(
    userId: string,
    importId: string,
    input: ConfirmStudioProjectImport,
  ): Promise<StudioProjectImportResult> {
    const imported = await this.projectImportService.getById(importId);
    if (!imported || imported.ownerId !== userId) {
      throw apiError(CommonErrorCode.NotFound, { message: '存稿导入预览不存在。' });
    }
    if (imported.status === 'IMPORTED') {
      if (!imported.projectId) {
        throw apiError(CommonErrorCode.InternalServerError, { message: '导入记录缺少作品关联。' });
      }
      const project = await this.getOwnedProject(userId, imported.projectId);
      return {
        importId,
        project: this.toProjectSummary(project),
        importedChapterCount: project.chapterCount,
        importedFactCount: this.importedFactCount(imported.preview),
      };
    }

    const parsed = await this.parseImportedManuscript({
      filename: imported.filename,
      format: imported.sourceFormat as 'txt' | 'md' | 'docx',
      contentBase64: imported.sourceContentBase64,
    });
    if (parsed.contentHash !== imported.contentHash) {
      throw apiError(CommonErrorCode.BadRequest, { message: '原始存稿校验失败，请重新上传。' });
    }
    const storedPreview = StudioProjectImportPreviewDataSchema.safeParse(imported.preview);
    const factCandidates = storedPreview.success
      ? storedPreview.data.factCandidates
      : this.importFactCandidates(parsed.chapters);
    const acceptedFactCandidateIds = input.acceptedFactCandidateIds ?? [];
    const acceptedCandidateIds = new Set(acceptedFactCandidateIds);
    if (acceptedCandidateIds.size !== acceptedFactCandidateIds.length) {
      throw apiError(CommonErrorCode.BadRequest, { message: '导入事实候选不能重复选择。' });
    }
    const acceptedFactCandidates = factCandidates.filter((candidate) =>
      acceptedCandidateIds.has(candidate.id),
    );
    if (acceptedFactCandidates.length !== acceptedCandidateIds.size) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '导入事实候选已失效，请重新预览后确认。',
      });
    }

    const project = await this.unitOfWork.execute(async () => {
      const created = await this.projectService.create({
        ownerId: userId,
        title: input.title,
        format: 'novel',
        genre: input.genre,
        premise: `从《${imported.filename}》导入的既有存稿。`,
        chapterCount: parsed.chapters.length,
        targetWordsPerChapter: input.targetWordsPerChapter,
        guidance: input.guidance,
        generateOutline: false,
      });
      const outline = parsed.chapters
        .map((chapter) => `第 ${chapter.chapterNumber} 章：${chapter.title}`)
        .join('\n');
      const blueprint = await this.blueprintService.create({
        project: { connect: { id: created.id } },
        version: 1,
        status: 'CONFIRMED',
        architecture: `从《${imported.filename}》导入的小说正文。`,
        outline,
        source: 'import',
        schemaVersion: 1,
        contentHash: this.hashBlueprint(`从《${imported.filename}》导入的小说正文。`, outline),
      });
      await this.projectService.update(
        { id: created.id },
        { currentBlueprint: { connect: { id: blueprint.id } } },
      );
      const importedFacts = await Promise.all(
        acceptedFactCandidates.map((candidate) =>
          this.factService.create({
            project: { connect: { id: created.id } },
            factType: candidate.factType,
            subject: candidate.subject,
            predicate: candidate.predicate,
            value: candidate.value,
            effectiveChapter: candidate.chapterNumber,
            status: 'CONFIRMED',
          }),
        ),
      );
      for (const chapter of parsed.chapters) {
        const planInput: UpdateStudioChapterPlan = {
          title: chapter.title,
          goal: '保留导入存稿的既有章节内容。',
          conflict: '',
          characters: [],
          location: '',
          timeConstraint: '',
          foreshadowing: '',
          hook: '',
        };
        const plan = await this.chapterPlanService.create({
          project: { connect: { id: created.id } },
          blueprint: { connect: { id: blueprint.id } },
          chapterNumber: chapter.chapterNumber,
          version: 1,
          status: 'CONFIRMED',
          needsReview: false,
          ...planInput,
          source: 'import',
          schemaVersion: 1,
          contentHash: this.hashChapterPlan(planInput),
        });
        const revision = await this.chapterRevisionService.create({
          id: randomUUID(),
          project: { connect: { id: created.id } },
          chapterPlan: { connect: { id: plan.id } },
          chapterNumber: chapter.chapterNumber,
          version: 1,
          status: 'FINALIZED',
          content: chapter.content,
          wordCount: this.countWords(chapter.content),
          promptSummary: `从《${imported.filename}》导入。`,
          source: 'import',
          schemaVersion: 1,
          contentHash: createHash('sha256').update(chapter.content, 'utf8').digest('hex'),
        });
        await this.setCurrentDraftPointer(revision);
        await this.chapterFinalPointerService.upsert({
          where: {
            projectId_chapterNumber: {
              projectId: created.id,
              chapterNumber: chapter.chapterNumber,
            },
          },
          create: {
            project: { connect: { id: created.id } },
            chapterNumber: chapter.chapterNumber,
            revision: { connect: { id: revision.id } },
          },
          update: { revision: { connect: { id: revision.id } } },
        });
        const finalization = await this.chapterFinalizationService.create({
          project: { connect: { id: created.id } },
          revision: { connect: { id: revision.id } },
          chapterNumber: chapter.chapterNumber,
          status: 'FINALIZED',
          factSnapshotRecorded: true,
          summaryStatus: 'COMPLETED',
          indexStatus: 'COMPLETED',
        });
        const factsForSnapshot = importedFacts.filter(
          (fact) => fact.effectiveChapter <= chapter.chapterNumber,
        );
        if (factsForSnapshot.length > 0) {
          await this.finalizationFactSnapshotService.createMany(
            factsForSnapshot.map((fact) => ({
              finalizationId: finalization.id,
              projectId: created.id,
              sourceFactId: fact.id,
              factType: fact.factType,
              subject: fact.subject,
              predicate: fact.predicate,
              value: fact.value,
              effectiveChapter: fact.effectiveChapter,
              status: fact.status,
              schemaVersion: fact.schemaVersion,
            })),
          );
        }
      }
      await this.projectImportService.update(
        { id: imported.id },
        {
          project: { connect: { id: created.id } },
          status: 'IMPORTED',
          confirmedAt: new Date(),
          preview: {
            chapters: parsed.chapters.map((chapter) => ({
              chapterNumber: chapter.chapterNumber,
              title: chapter.title,
              characterCount: chapter.content.length,
              excerpt: this.importExcerpt(chapter.content),
            })),
            factCandidates,
            acceptedFactCandidateIds,
          },
        },
      );
      await this.auditLogService.logCreate('studio.project_import', imported.id, userId, {
        projectId: created.id,
        filename: imported.filename,
        contentHash: imported.contentHash,
        importedChapterCount: parsed.chapters.length,
        importedFactCount: acceptedFactCandidates.length,
      });
      return created;
    });
    return {
      importId,
      project: this.toProjectSummary(project),
      importedChapterCount: parsed.chapters.length,
      importedFactCount: acceptedFactCandidates.length,
    };
  }

  async exportProject(
    userId: string,
    projectId: string,
    query: StudioProjectExportQuery,
  ): Promise<StudioProjectExport> {
    const project = await this.getOwnedProject(userId, projectId);
    const [pointers, openFindings, facts] = await Promise.all([
      this.chapterFinalPointerService.list(
        { projectId },
        { page: 1, limit: 500, orderBy: { chapterNumber: 'asc' } },
        { include: { revision: true } },
      ),
      this.reviewFindingService.count({ projectId, severity: 'BLOCKING', status: 'OPEN' }),
      this.factService.count({ projectId, status: 'CONFIRMED' }),
    ]);
    if (openFindings > 0 && (!query.force || !query.forceReason)) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: `存在 ${openFindings} 个未处理硬事实问题；强制导出必须填写理由。`,
      });
    }
    const finals = (
      await Promise.all(
        pointers.list.map(async (pointer) => {
          const revision = await this.chapterRevisionService.getById(pointer.revisionId);
          return revision ? { chapterNumber: pointer.chapterNumber, revision } : null;
        }),
      )
    ).filter(
      (item): item is { chapterNumber: number; revision: StudioChapterRevision } => item !== null,
    );
    const metadata = [
      `作品：${project.title}`,
      `定稿章节：${finals.length}`,
      `确认事实：${facts}`,
      `未处理硬问题：${openFindings}`,
    ];
    const chapters = finals.map(({ chapterNumber, revision }) => ({
      chapterNumber,
      content: revision.content,
    }));
    const content =
      query.format === 'md'
        ? [
            `# ${project.title}`,
            '',
            ...metadata.map((item) => `${item}  `),
            '',
            ...chapters.flatMap(({ chapterNumber, content }) => [
              `## 第 ${chapterNumber} 章`,
              '',
              content,
              '',
            ]),
          ].join('\n')
        : [
            ...metadata,
            '',
            ...chapters.flatMap(({ chapterNumber, content }) => [
              `第 ${chapterNumber} 章`,
              '',
              content,
              '',
            ]),
          ].join('\n');
    const warnings = openFindings > 0 ? [`含 ${openFindings} 个未处理硬事实问题。`] : [];
    await this.auditLogService.logExport('studio.project', userId, {
      projectId,
      format: query.format,
      force: query.force,
      forceReason: query.forceReason,
      chapterCount: finals.length,
      warnings,
    });
    return {
      filename: `${this.safeExportFilename(project.title)}.${query.format}`,
      contentType: query.format === 'md' ? 'text/markdown' : 'text/plain',
      content,
      warnings,
    };
  }

  async getProjectOverview(userId: string, projectId: string): Promise<StudioProjectOverview> {
    await this.getOwnedProject(userId, projectId);
    const [
      finalizedChapterCount,
      pendingChapterPlans,
      pendingFactChangeCount,
      confirmedFactCount,
      blockingFindingCount,
      pendingFinalizationTaskCount,
      failedFinalizationTaskCount,
    ] = await Promise.all([
      this.chapterFinalPointerService.count({ projectId }),
      this.chapterPlanService.list(
        { projectId, needsReview: true },
        { page: 1, limit: 500, orderBy: { chapterNumber: 'asc' } },
      ),
      this.factChangeService.count({ projectId, status: 'PROPOSED' }),
      this.factService.count({ projectId, status: 'CONFIRMED' }),
      this.reviewFindingService.count({ projectId, severity: 'BLOCKING', status: 'OPEN' }),
      this.finalizationOutboxTaskService.count({
        projectId,
        status: { in: ['PENDING', 'RUNNING', 'RECOVERABLE'] },
      }),
      this.finalizationOutboxTaskService.count({ projectId, status: 'FAILED' }),
    ]);
    return {
      projectId,
      finalizedChapterCount,
      pendingChapterReviewNumbers: [
        ...new Set(pendingChapterPlans.list.map((plan) => plan.chapterNumber)),
      ],
      pendingFactChangeCount,
      confirmedFactCount,
      blockingFindingCount,
      pendingFinalizationTaskCount,
      failedFinalizationTaskCount,
    };
  }

  async listProjectEvents(
    userId: string,
    projectId: string,
    query: StudioProjectEventListQuery,
  ): Promise<StudioProjectEventListResponse> {
    await this.getOwnedProject(userId, projectId);
    const events = await this.projectEventService.list(
      { projectId },
      { page: query.page, limit: query.limit, orderBy: { createdAt: 'desc' } },
    );
    return {
      ...events,
      list: events.list.map(
        (event) =>
          ({
            id: event.id,
            projectId: event.projectId,
            type: (
              {
                GENERATION_STATUS: 'generation_status',
                FINALIZATION_TASK_STATUS: 'finalization_task_status',
                FACT_CHANGE_DECISION: 'fact_change_decision',
              } as const
            )[event.type],
            payload: event.payload as Record<string, unknown>,
            createdAt: event.createdAt.toISOString(),
          }) satisfies StudioProjectEventResponse,
      ),
    };
  }

  async *streamProjectEvents(
    userId: string,
    projectId: string,
    signal: AbortSignal,
    lastEventId?: string,
  ): AsyncGenerator<{ id: string; event: string; data: string }> {
    await this.getOwnedProject(userId, projectId);
    const validLastEventId = lastEventId && z.string().uuid().safeParse(lastEventId).success;
    const lastEvent = validLastEventId ? await this.projectEventService.getById(lastEventId) : null;
    let cursor =
      lastEvent?.projectId === projectId
        ? { createdAt: lastEvent.createdAt, id: lastEvent.id }
        : null;
    while (!signal.aborted) {
      const events = await this.projectEventService.list(
        {
          projectId,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { gt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { gt: cursor.id } },
                ],
              }
            : {}),
        },
        { page: 1, limit: 100, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      );
      for (const event of events.list) {
        cursor = { createdAt: event.createdAt, id: event.id };
        yield {
          id: event.id,
          event: 'studio-project-event',
          data: JSON.stringify(this.toProjectEvent(event)),
        };
      }
      if (events.list.length === 100) continue;
      await this.waitForProjectEventPoll(signal);
    }
  }

  private waitForProjectEventPoll(signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        resolve();
      };
      const timer = setTimeout(finish, 2_500);
      signal.addEventListener('abort', finish, { once: true });
    });
  }

  async listFinalizationTasks(
    userId: string,
    projectId: string,
    query: StudioFinalizationTaskListQuery,
  ): Promise<StudioFinalizationTaskListResponse> {
    await this.getOwnedProject(userId, projectId);
    const tasks = await this.finalizationOutboxTaskService.list(
      { projectId },
      { page: query.page, limit: query.limit, orderBy: { createdAt: 'desc' } },
    );
    return { ...tasks, list: tasks.list.map((task) => this.toFinalizationTask(task)) };
  }

  async retryFinalizationTask(
    userId: string,
    projectId: string,
    taskId: string,
  ): Promise<StudioFinalizationTaskResponse> {
    await this.getOwnedProject(userId, projectId);
    const task = await this.finalizationOutboxTaskService.getById(taskId);
    if (!task || task.projectId !== projectId)
      throw apiError(CommonErrorCode.NotFound, { message: '定稿后台任务不存在。' });
    if (task.status !== 'FAILED' && task.status !== 'RECOVERABLE')
      throw apiError(CommonErrorCode.BadRequest, { message: '该任务当前不能重试。' });
    const updated = await this.finalizationOutboxTaskService.update(
      { id: task.id },
      { status: 'PENDING', lastError: null },
    );
    await this.chapterFinalizationService.update(
      { id: updated.finalizationId },
      { status: 'FINALIZING', error: null },
    );
    await this.projectEventService.create({
      project: { connect: { id: projectId } },
      type: 'FINALIZATION_TASK_STATUS',
      payload: {
        taskId: updated.id,
        status: 'pending',
        type: updated.type.toLowerCase(),
        attemptCount: updated.attemptCount,
      },
    });
    await this.auditLogService.logUpdate(
      'studio.finalization_task',
      updated.id,
      userId,
      { action: 'retry' },
      { projectId, type: updated.type },
    );
    return this.toFinalizationTask(updated);
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

  async listBlueprints(
    userId: string,
    projectId: string,
    query: StudioBlueprintListQuery,
  ): Promise<StudioBlueprintListResponse> {
    await this.getOwnedProject(userId, projectId);
    const blueprints = await this.blueprintService.list(
      { projectId },
      { page: query.page, limit: query.limit, orderBy: { version: 'desc' } },
    );
    return { ...blueprints, list: blueprints.list.map((blueprint) => this.toBlueprint(blueprint)) };
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
      await this.auditLogService.logUpdate(
        'studio.blueprint',
        confirmed.id,
        userId,
        { status: 'confirmed' },
        { projectId, version: confirmed.version },
      );
      return confirmed;
    });

    return this.toBlueprint(blueprint);
  }

  async restoreBlueprint(
    userId: string,
    projectId: string,
    blueprintId: string,
  ): Promise<StudioBlueprintRestoreResult> {
    await this.getOwnedProject(userId, projectId);
    const blueprint = await this.blueprintService.getById(blueprintId);
    if (!blueprint || blueprint.projectId !== projectId || blueprint.status !== 'CONFIRMED')
      throw apiError(CommonErrorCode.BadRequest, { message: '只能恢复已确认的项目蓝图。' });
    const plans = await this.chapterPlanService.list(
      { projectId, blueprintId: { not: blueprintId } },
      { page: 1, limit: 500, orderBy: { chapterNumber: 'asc' } },
    );
    const affectedChapterNumbers = [...new Set(plans.list.map((plan) => plan.chapterNumber))];
    await this.unitOfWork.execute(async () => {
      await this.projectService.update(
        { id: projectId },
        { currentBlueprint: { connect: { id: blueprintId } } },
      );
      await this.chapterPlanService.updateMany(
        { projectId, blueprintId: { not: blueprintId } },
        { needsReview: true },
      );
      await this.auditLogService.logUpdate(
        'studio.blueprint',
        blueprintId,
        userId,
        { action: 'restore_blueprint' },
        { projectId, affectedChapterNumbers },
      );
    });
    return { blueprint: this.toBlueprint(blueprint), affectedChapterNumbers };
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
              needsReview: false,
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
            needsReview: false,
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
    if (latest.status === 'CONFIRMED' && !latest.needsReview) return this.toChapterPlan(latest);

    const confirmed = await this.chapterPlanService.update(
      { id: latest.id },
      { status: 'CONFIRMED', needsReview: false },
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
    if (
      !plan ||
      plan.status !== 'CONFIRMED' ||
      plan.needsReview ||
      plan.blueprintId !== blueprint.id
    ) {
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
    await this.projectService.update({ id: projectId }, { updatedAt: new Date() });
    await this.projectEventService.create({
      project: { connect: { id: projectId } },
      type: 'GENERATION_STATUS',
      payload: { runId, status: 'queued', progress: 0, currentStep: 'Queued for chapter draft' },
    });
    await this.auditLogService.logCreate('studio.generation_run', runId, userId, {
      action: 'create_chapter_draft',
      projectId,
      chapterNumber,
      planId: plan.id,
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
      const failedRun = await this.runService.update(
        { id: runId },
        {
          status: 'FAILED',
          progress: 100,
          currentStep: 'Chapter draft service unavailable',
          error: '章节草稿服务暂时不可用，请稍后重试。',
        },
      );
      await this.projectService.update({ id: projectId }, { updatedAt: failedRun.updatedAt });
      await this.projectEventService.create({
        project: { connect: { id: projectId } },
        type: 'GENERATION_STATUS',
        payload: {
          runId,
          status: 'failed',
          progress: 100,
          currentStep: failedRun.currentStep,
          failureReason: failedRun.error,
        },
      });
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
    await this.auditLogService.logUpdate(
      'studio.chapter_draft_pointer',
      revision.id,
      userId,
      undefined,
      {
        projectId,
        chapterNumber,
        action: 'restore_draft',
      },
    );
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
      await this.auditLogService.logCreate('studio.chapter_revision', authorRevision.id, userId, {
        projectId,
        chapterNumber,
        sourceRevisionId,
        source: 'author',
      });
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
      const factsForSnapshot = await this.listAllConfirmedFacts(projectId);
      await this.finalizationFactSnapshotService.createMany(
        factsForSnapshot.map((fact) => ({
          finalizationId: pendingFinalization.id,
          projectId,
          sourceFactId: fact.id,
          factType: fact.factType,
          subject: fact.subject,
          predicate: fact.predicate,
          value: fact.value,
          effectiveChapter: fact.effectiveChapter,
          status: fact.status,
          schemaVersion: fact.schemaVersion,
        })),
      );

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
      const finalizing = await this.chapterFinalizationService.update(
        { id: pendingFinalization.id },
        { factSnapshotRecorded: true },
      );
      await this.auditLogService.logUpdate(
        'studio.chapter_finalization',
        finalizing.id,
        userId,
        { status: 'finalizing' },
        { projectId, chapterNumber, revisionId },
      );
      return finalizing;
    });
    return this.toChapterFinalization(finalization);
  }

  async restoreFinalChapterRevision(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
  ): Promise<StudioChapterFinalRestoreResult> {
    const revision = await this.getOwnedChapterRevision(
      userId,
      projectId,
      chapterNumber,
      revisionId,
    );
    const finalization = await this.chapterFinalizationService.getByRevisionId(revisionId);
    if (!finalization || finalization.status !== 'FINALIZED')
      throw apiError(CommonErrorCode.BadRequest, { message: '只能恢复曾成功定稿的章节版本。' });
    const [laterPlans, snapshots] = await Promise.all([
      this.listAllLaterChapterPlans(projectId, chapterNumber),
      this.listAllFinalizationFactSnapshots(projectId, finalization.id),
    ]);
    const affectedChapterNumbers = [...new Set(laterPlans.map((plan) => plan.chapterNumber))];
    if (!finalization.factSnapshotRecorded) {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '该历史定稿尚未保存事实快照，不能安全恢复。',
      });
    }
    await this.unitOfWork.execute(async () => {
      const current = await this.chapterFinalPointerService.get({ projectId, chapterNumber });
      if (current && current.revisionId !== revisionId)
        await this.chapterRevisionService.update(
          { id: current.revisionId },
          { status: 'SUPERSEDED' },
        );
      await this.chapterRevisionService.update({ id: revision.id }, { status: 'FINALIZED' });
      await this.setCurrentDraftPointer(revision);
      await this.chapterFinalPointerService.upsert({
        where: { projectId_chapterNumber: { projectId, chapterNumber } },
        create: {
          project: { connect: { id: projectId } },
          chapterNumber,
          revision: { connect: { id: revisionId } },
        },
        update: { revision: { connect: { id: revisionId } } },
      });
      await this.chapterPlanService.updateMany(
        { projectId, chapterNumber: { gt: chapterNumber } },
        { needsReview: true },
      );
      await this.factService.updateMany({ projectId, status: 'CONFIRMED' }, { status: 'RETIRED' });
      for (const snapshot of snapshots) {
        const sourceFact = await this.factService.getById(snapshot.sourceFactId);
        const data = {
          factType: snapshot.factType,
          subject: snapshot.subject,
          predicate: snapshot.predicate,
          value: snapshot.value,
          effectiveChapter: snapshot.effectiveChapter,
          status: 'CONFIRMED' as const,
          schemaVersion: snapshot.schemaVersion,
        };
        if (sourceFact?.projectId === projectId)
          await this.factService.update({ id: sourceFact.id }, data);
        else await this.factService.create({ project: { connect: { id: projectId } }, ...data });
      }
      await this.auditLogService.logUpdate(
        'studio.chapter_finalization',
        revisionId,
        userId,
        { action: 'restore_final' },
        { projectId, chapterNumber, affectedChapterNumbers, restoredFactCount: snapshots.length },
      );
    });
    return {
      revision: this.toChapterRevision(revision),
      restoredFactCount: snapshots.length,
      affectedChapterNumbers,
    };
  }

  async listChapterFinalizations(
    userId: string,
    projectId: string,
    chapterNumber: number,
    query: StudioChapterFinalizationListQuery,
  ): Promise<StudioChapterFinalizationListResponse> {
    await this.getOwnedProject(userId, projectId);
    const finalizations = await this.chapterFinalizationService.list(
      { projectId, chapterNumber, status: 'FINALIZED' },
      { page: query.page, limit: query.limit, orderBy: { finalizedAt: 'desc' } },
    );
    return {
      ...finalizations,
      list: finalizations.list.map((item) => this.toChapterFinalization(item)),
    };
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

  async listReviewFindings(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
    query: StudioReviewFindingListQuery,
  ): Promise<StudioReviewFindingListResponse> {
    await this.getOwnedChapterRevision(userId, projectId, chapterNumber, revisionId);
    const findings = await this.reviewFindingService.list(
      { projectId, chapterNumber, revisionId },
      { page: query.page, limit: query.limit, orderBy: { createdAt: 'desc' } },
    );
    return { ...findings, list: findings.list.map((finding) => this.toReviewFinding(finding)) };
  }

  async resolveReviewFinding(
    userId: string,
    projectId: string,
    chapterNumber: number,
    revisionId: string,
    findingId: string,
    input: ResolveStudioReviewFinding,
  ): Promise<StudioReviewFindingResponse> {
    await this.getOwnedChapterRevision(userId, projectId, chapterNumber, revisionId);
    const finding = await this.reviewFindingService.getById(findingId);
    if (
      !finding ||
      finding.projectId !== projectId ||
      finding.chapterNumber !== chapterNumber ||
      finding.revisionId !== revisionId
    )
      throw apiError(CommonErrorCode.NotFound, { message: '审校问题不存在。' });
    if (finding.status !== 'OPEN')
      throw apiError(CommonErrorCode.BadRequest, { message: '该审校问题已经处理。' });
    const status = {
      resolve: 'RESOLVED',
      ignore: 'IGNORED',
      intentional_change: 'INTENTIONAL_CHANGE',
    } as const;
    const resolvedAt = new Date();
    const updatedFinding = await this.unitOfWork.execute(async () => {
      if (input.decision === 'intentional_change') {
        if (!finding.factId || !input.resolvedValue) {
          throw apiError(CommonErrorCode.BadRequest, {
            message: '记录有意变更必须关联确认事实并填写新的事实值。',
          });
        }
        const fact = await this.getOwnedFact(projectId, finding.factId);
        if (fact.value === input.resolvedValue) {
          throw apiError(CommonErrorCode.BadRequest, {
            message: '新的事实值必须与当前确认事实不同。',
          });
        }
        await this.factChangeService.create({
          project: { connect: { id: projectId } },
          revision: { connect: { id: revisionId } },
          targetFact: { connect: { id: fact.id } },
          chapterNumber,
          operation: 'UPDATE',
          factType: fact.factType,
          subject: fact.subject,
          predicate: fact.predicate,
          proposedValue: input.resolvedValue,
          rationale: input.reason,
          evidence: finding.evidence,
          source: 'author',
          status: 'ACCEPTED_PENDING_FINALIZATION',
          resolvedValue: input.resolvedValue,
          resolvedAt,
        });
      }
      return this.reviewFindingService.update(
        { id: finding.id },
        { status: status[input.decision], resolutionReason: input.reason, resolvedAt },
      );
    });
    if (input.decision === 'intentional_change') {
      await this.projectEventService.create({
        project: { connect: { id: projectId } },
        type: 'FACT_CHANGE_DECISION',
        payload: {
          findingId: finding.id,
          chapterNumber,
          revisionId,
          decision: 'intentional_change',
        },
      });
    }
    await this.auditLogService.logUpdate(
      'studio.review_finding',
      finding.id,
      userId,
      { status: status[input.decision].toLowerCase() },
      { projectId, chapterNumber, revisionId, decision: input.decision },
    );
    return this.toReviewFinding(updatedFinding);
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
    await this.projectEventService.create({
      project: { connect: { id: projectId } },
      type: 'FACT_CHANGE_DECISION',
      payload: {
        changeId: resolved.id,
        chapterNumber,
        revisionId,
        operation: resolved.operation.toLowerCase(),
        decision: input.decision,
      },
    });
    await this.auditLogService.logUpdate(
      'studio.fact_change',
      resolved.id,
      userId,
      { status: resolved.status.toLowerCase() },
      { projectId, chapterNumber, revisionId, decision: input.decision },
    );
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

  private async listAllConfirmedFacts(projectId: string): Promise<StudioFact[]> {
    const pageSize = 500;
    const firstPage = await this.factService.list(
      { projectId, status: 'CONFIRMED' },
      { page: 1, limit: pageSize, orderBy: { createdAt: 'asc' } },
    );
    const facts = [...firstPage.list];
    for (let page = 2; facts.length < firstPage.total; page += 1) {
      const nextPage = await this.factService.list(
        { projectId, status: 'CONFIRMED' },
        { page, limit: pageSize, orderBy: { createdAt: 'asc' } },
      );
      if (nextPage.list.length === 0) break;
      facts.push(...nextPage.list);
    }
    return facts;
  }

  private async listAllLaterChapterPlans(
    projectId: string,
    chapterNumber: number,
  ): Promise<StudioChapterPlan[]> {
    const pageSize = 500;
    const firstPage = await this.chapterPlanService.list(
      { projectId, chapterNumber: { gt: chapterNumber } },
      { page: 1, limit: pageSize, orderBy: { chapterNumber: 'asc' } },
    );
    const plans = [...firstPage.list];
    for (let page = 2; plans.length < firstPage.total; page += 1) {
      const nextPage = await this.chapterPlanService.list(
        { projectId, chapterNumber: { gt: chapterNumber } },
        { page, limit: pageSize, orderBy: { chapterNumber: 'asc' } },
      );
      if (nextPage.list.length === 0) break;
      plans.push(...nextPage.list);
    }
    return plans;
  }

  private async listAllFinalizationFactSnapshots(
    projectId: string,
    finalizationId: string,
  ): Promise<StudioFinalizationFactSnapshot[]> {
    const pageSize = 500;
    const firstPage = await this.finalizationFactSnapshotService.list(
      { projectId, finalizationId },
      { page: 1, limit: pageSize, orderBy: { createdAt: 'asc' } },
    );
    const snapshots = [...firstPage.list];
    for (let page = 2; snapshots.length < firstPage.total; page += 1) {
      const nextPage = await this.finalizationFactSnapshotService.list(
        { projectId, finalizationId },
        { page, limit: pageSize, orderBy: { createdAt: 'asc' } },
      );
      if (nextPage.list.length === 0) break;
      snapshots.push(...nextPage.list);
    }
    return snapshots;
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

  private async getOwnedAdaptation(
    userId: string,
    adaptationId: string,
  ): Promise<StudioAdaptationProject> {
    const adaptation = await this.adaptationProjectService.getById(adaptationId);
    if (!adaptation || adaptation.ownerId !== userId) {
      throw apiError(CommonErrorCode.NotFound, { message: '改编项目不存在。' });
    }
    return adaptation;
  }

  private async getAdaptationSnapshot(
    adaptationId: string,
  ): Promise<StudioAdaptationSourceSnapshot> {
    const snapshot = await this.adaptationSourceSnapshotService.get({ adaptationId });
    if (!snapshot) {
      throw apiError(CommonErrorCode.InternalServerError, {
        message: '改编来源快照缺失，请联系支持人员。',
      });
    }
    return snapshot;
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
    const previous = await this.runService.getById(runId);
    const run = await this.runService.update(
      { id: runId },
      {
        status: dbStatusMap[runtimeJob.status],
        progress: runtimeJob.progress,
        currentStep: runtimeJob.currentStep,
        architecture: runtimeJob.artifact?.architecture ?? previous?.architecture ?? null,
        outline: runtimeJob.artifact?.outline ?? previous?.outline ?? null,
        chapterContent: runtimeJob.artifact?.chapterDraft ?? previous?.chapterContent ?? null,
        factChanges: JSON.parse(
          JSON.stringify(runtimeJob.artifact?.factChanges ?? previous?.factChanges ?? []),
        ),
        ...(runtimeJob.modelConfig
          ? { modelConfig: JSON.parse(JSON.stringify(runtimeJob.modelConfig)) }
          : {}),
        attemptCount: runtimeJob.attemptCount,
        error: runtimeJob.error ?? null,
      },
    );
    if (
      !previous ||
      previous.status !== run.status ||
      previous.progress !== run.progress ||
      previous.currentStep !== run.currentStep
    ) {
      await this.projectService.update({ id: run.projectId }, { updatedAt: run.updatedAt });
      await this.projectEventService.create({
        project: { connect: { id: run.projectId } },
        type: 'GENERATION_STATUS',
        payload: {
          runId: run.id,
          status: runStatusMap[run.status],
          progress: run.progress,
          currentStep: run.currentStep,
          elapsedMs: Date.now() - run.createdAt.getTime(),
          ...(run.error ? { failureReason: run.error } : {}),
        },
      });
    }
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

  private async parseImportedManuscript(input: PreviewStudioProjectImport): Promise<{
    sourceFormat: 'txt' | 'md' | 'docx';
    contentHash: string;
    chapters: ImportedChapter[];
  }> {
    const sourceFormat = input.format ?? this.importSourceFormat(input.filename);
    let content: string;
    try {
      const rawBytes = Buffer.from(input.contentBase64, 'base64');
      content =
        sourceFormat === 'docx'
          ? (await mammoth.extractRawText({ buffer: rawBytes })).value
          : new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
      content = content.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n');
    } catch {
      throw apiError(CommonErrorCode.BadRequest, {
        message: '存稿必须是 UTF-8 编码的 TXT/Markdown 或有效 DOCX 文件。',
      });
    }
    if (!content.trim()) {
      throw apiError(CommonErrorCode.BadRequest, { message: '存稿内容不能为空。' });
    }
    const matches = Array.from(
      content.matchAll(
        /^(?:#{1,6}\s+)?(?:第\s*(?:\d+|[一二三四五六七八九十百千]+)\s*章.*|chapter\s*\d+.*)$/gimu,
      ),
    );
    const chapters =
      matches.length === 0
        ? [{ chapterNumber: 1, title: this.importTitle(input.filename), content: content.trim() }]
        : matches.map((match, index) => {
            const heading = match[0].replace(/^#{1,6}\s*/u, '').trim();
            const start = (match.index ?? 0) + match[0].length;
            const end = matches[index + 1]?.index ?? content.length;
            return {
              chapterNumber: index + 1,
              title: heading.slice(0, 200) || `第 ${index + 1} 章`,
              content: content.slice(start, end).trim() || heading,
            };
          });
    if (chapters.length > 500) {
      throw apiError(CommonErrorCode.BadRequest, { message: '单次导入最多支持 500 章。' });
    }
    return {
      sourceFormat,
      contentHash: createHash('sha256')
        .update(Buffer.from(input.contentBase64, 'base64'))
        .digest('hex'),
      chapters,
    };
  }

  private importTitle(filename: string): string {
    return (
      filename
        .replace(/\.(txt|md|docx)$/iu, '')
        .trim()
        .slice(0, 200) || '导入正文'
    );
  }

  private importSourceFormat(filename: string): 'txt' | 'md' | 'docx' {
    const extension = filename.toLowerCase().split('.').at(-1);
    return extension === 'docx' ? 'docx' : extension === 'md' ? 'md' : 'txt';
  }

  private importExcerpt(content: string): string {
    return content.replace(/\s+/gu, ' ').trim().slice(0, 160);
  }

  private importFactCandidates(chapters: ImportedChapter[]): StudioProjectImportFactCandidate[] {
    const candidates: StudioProjectImportFactCandidate[] = [];
    const seen = new Set<string>();
    const patterns: Array<{
      expression: RegExp;
      factType: string;
      predicate: string;
      confidence: number;
    }> = [
      {
        expression:
          /(?<subject>[\u4E00-\u9FFF]{2,12})(?:是|为|叫|名为)(?<value>[^，。！？\n]{2,80})/gu,
        factType: 'character',
        predicate: 'description',
        confidence: 0.45,
      },
      {
        expression:
          /(?<subject>[\u4E00-\u9FFF]{2,12})(?:来自|出生于)(?<value>[^，。！？\n]{2,80})/gu,
        factType: 'character',
        predicate: 'origin',
        confidence: 0.4,
      },
      {
        expression:
          /(?<subject>[\u4E00-\u9FFF]{2,12})(?:住在|居住在|位于)(?<value>[^，。！？\n]{2,80})/gu,
        factType: 'world',
        predicate: 'location',
        confidence: 0.4,
      },
    ];
    for (const chapter of chapters) {
      for (const pattern of patterns) {
        for (const match of chapter.content.matchAll(pattern.expression)) {
          const subject = match.groups?.subject?.trim();
          const value = match.groups?.value?.trim();
          if (!subject || !value) continue;
          const evidence = match[0].trim();
          const key = `${chapter.chapterNumber}:${pattern.factType}:${subject}:${pattern.predicate}:${value}`;
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push({
            id: this.hashContent(`${key}:${evidence}`),
            chapterNumber: chapter.chapterNumber,
            factType: pattern.factType,
            subject,
            predicate: pattern.predicate,
            value,
            evidence: evidence.slice(0, 500),
            confidence: pattern.confidence,
          });
          if (candidates.length >= 200) return candidates;
        }
      }
    }
    return candidates;
  }

  private importedFactCount(preview: unknown): number {
    const parsed = StudioProjectImportPreviewDataSchema.safeParse(preview);
    return parsed.success ? parsed.data.acceptedFactCandidateIds.length : 0;
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

  private safeExportFilename(title: string): string {
    return title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'hanlin-project';
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

  private toProjectSummary(project: StudioProject): StudioProjectImportResult['project'] {
    return {
      id: project.id,
      title: project.title,
      format: project.format as StudioProjectImportResult['project']['format'],
      genre: project.genre,
      chapterCount: project.chapterCount,
      targetWordsPerChapter: project.targetWordsPerChapter,
    };
  }

  private toAdaptation(
    adaptation: StudioAdaptationProject,
    snapshot: StudioAdaptationSourceSnapshot,
  ): StudioAdaptationProjectResponse {
    const targetFormat = {
      SERIES: 'series',
      SHORT_DRAMA: 'short_drama',
    } as const;
    const status = {
      BRIEF_DRAFT: 'brief_draft',
      BLUEPRINT_REVIEW: 'blueprint_review',
      SCENE_PLANNING: 'scene_planning',
      SCRIPT_WRITING: 'script_writing',
      REVIEW_READY: 'review_ready',
      DELIVERABLE: 'deliverable',
    } as const;
    return {
      id: adaptation.id,
      sourceProjectId: adaptation.sourceProjectId,
      targetFormat: targetFormat[adaptation.targetFormat],
      episodeCount: adaptation.episodeCount,
      minutesPerEpisode: adaptation.minutesPerEpisode,
      targetAudience: adaptation.targetAudience,
      adaptationGoal: adaptation.adaptationGoal,
      mustPreserve: adaptation.mustPreserve,
      status: status[adaptation.status],
      sourceSnapshot: {
        id: snapshot.id,
        sourceProjectId: snapshot.sourceProjectId,
        sourceProjectTitle: snapshot.sourceProjectTitle,
        sourceProjectUpdatedAt: snapshot.sourceProjectUpdatedAt.toISOString(),
        sourceChapterCount: snapshot.sourceChapterCount,
        createdAt: snapshot.createdAt.toISOString(),
      },
      createdAt: adaptation.createdAt.toISOString(),
      updatedAt: adaptation.updatedAt.toISOString(),
    };
  }

  private toAdaptationDecision(
    decision: StudioAdaptationDecision,
    sourceChapter: StudioAdaptationSourceChapter,
  ): StudioAdaptationDecisionResponse {
    const type = {
      CUT: 'cut',
      MERGE: 'merge',
      REORDER: 'reorder',
      POV_CHANGE: 'pov_change',
      EXPAND: 'expand',
    } as const;
    const impact = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
    } as const;
    const status = {
      PROPOSED: 'proposed',
      ACCEPTED: 'accepted',
      EDITED: 'edited',
      REJECTED: 'rejected',
    } as const;
    return {
      id: decision.id,
      adaptationId: decision.adaptationId,
      sourceSnapshotId: decision.snapshotId,
      sourceChapter: {
        id: sourceChapter.id,
        chapterNumber: sourceChapter.chapterNumber,
        title: sourceChapter.title,
      },
      type: type[decision.type],
      impact: impact[decision.impact],
      proposal: decision.proposal,
      rationale: decision.rationale,
      status: status[decision.status],
      resolutionReason: decision.resolutionReason,
      resolvedAt: decision.resolvedAt?.toISOString() ?? null,
      createdAt: decision.createdAt.toISOString(),
      updatedAt: decision.updatedAt.toISOString(),
    };
  }

  private toAdaptationSourceChapter(
    chapter: StudioAdaptationSourceChapter,
  ): StudioAdaptationSourceChapterResponse {
    return {
      id: chapter.id,
      snapshotId: chapter.snapshotId,
      sourceRevisionId: chapter.sourceRevisionId,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      content: chapter.content,
      contentHash: chapter.contentHash,
      wordCount: chapter.wordCount,
      createdAt: chapter.createdAt.toISOString(),
    };
  }

  private toScenePlan(plan: StudioScenePlan): StudioScenePlanResponse {
    return {
      id: plan.id,
      adaptationId: plan.adaptationId,
      episodeNumber: plan.episodeNumber,
      title: plan.title,
      synopsis: plan.synopsis,
      sceneOutline: (plan.sceneOutline ?? []) as StudioScenePlanSceneOutline,
      needsReview: plan.needsReview,
      confirmedAt: plan.confirmedAt?.toISOString() ?? null,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  private toSourceSceneMapping(
    mapping: StudioSourceSceneMapping,
    sourceChapter: StudioAdaptationSourceChapter,
  ): StudioSourceSceneMappingResponse {
    const status = {
      PROPOSED: 'proposed',
      CONFIRMED: 'confirmed',
      STALE: 'stale',
    } as const;
    return {
      id: mapping.id,
      adaptationId: mapping.adaptationId,
      scenePlanId: mapping.scenePlanId,
      episodeNumber: mapping.episodeNumber,
      sceneNumber: mapping.sceneNumber,
      sourceChapter: {
        id: sourceChapter.id,
        chapterNumber: sourceChapter.chapterNumber,
        title: sourceChapter.title,
      },
      evidenceAnchor: mapping.evidenceAnchor,
      status: status[mapping.status],
      createdAt: mapping.createdAt.toISOString(),
      updatedAt: mapping.updatedAt.toISOString(),
    };
  }

  private toScreenplaySceneRevision(
    revision: StudioScreenplaySceneRevision,
  ): StudioScreenplaySceneRevisionResponse {
    const source = {
      AUTHOR: 'author',
      AI: 'ai',
    } as const;
    return {
      id: revision.id,
      adaptationId: revision.adaptationId,
      scenePlanId: revision.scenePlanId,
      episodeNumber: revision.episodeNumber,
      sceneNumber: revision.sceneNumber,
      source: source[revision.source],
      sourceRevisionId: revision.sourceRevisionId,
      version: revision.version,
      content: revision.content,
      contentHash: revision.contentHash,
      wordCount: revision.wordCount,
      editSummary: revision.editSummary,
      createdAt: revision.createdAt.toISOString(),
    };
  }

  private toAdaptationDecisionType(
    type: CreateStudioAdaptationDecision['type'],
  ): 'CUT' | 'MERGE' | 'REORDER' | 'POV_CHANGE' | 'EXPAND' {
    const types: Record<
      CreateStudioAdaptationDecision['type'],
      'CUT' | 'MERGE' | 'REORDER' | 'POV_CHANGE' | 'EXPAND'
    > = {
      cut: 'CUT',
      merge: 'MERGE',
      reorder: 'REORDER',
      pov_change: 'POV_CHANGE',
      expand: 'EXPAND',
    };
    return types[type];
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
      finalizedChapterCount: project.chapterFinalPointers.length,
      confirmedFactCount: project.facts.length,
      blockingFindingCount: project.reviewFindings.length,
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
      needsReview: plan.needsReview,
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
      status: finalization.status.toLowerCase() as StudioChapterFinalizationResponse['status'],
      summaryStatus:
        finalization.summaryStatus.toLowerCase() as StudioChapterFinalizationResponse['summaryStatus'],
      indexStatus:
        finalization.indexStatus.toLowerCase() as StudioChapterFinalizationResponse['indexStatus'],
      finalizedAt: finalization.finalizedAt.toISOString(),
      createdAt: finalization.createdAt.toISOString(),
      updatedAt: finalization.updatedAt.toISOString(),
    };
  }

  private toProjectEvent(
    event: import('@prisma/client').StudioProjectEvent,
  ): StudioProjectEventResponse {
    return {
      id: event.id,
      projectId: event.projectId,
      type: (
        {
          GENERATION_STATUS: 'generation_status',
          FINALIZATION_TASK_STATUS: 'finalization_task_status',
          FACT_CHANGE_DECISION: 'fact_change_decision',
        } as const
      )[event.type],
      payload: event.payload as Record<string, unknown>,
      createdAt: event.createdAt.toISOString(),
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

  private toReviewFinding(finding: StudioReviewFinding): StudioReviewFindingResponse {
    return {
      id: finding.id,
      projectId: finding.projectId,
      revisionId: finding.revisionId,
      chapterNumber: finding.chapterNumber,
      ...(finding.factId ? { factId: finding.factId } : {}),
      ruleId: finding.ruleId,
      severity: finding.severity.toLowerCase() as StudioReviewFindingResponse['severity'],
      status: finding.status.toLowerCase() as StudioReviewFindingResponse['status'],
      evidenceStart: finding.evidenceStart,
      evidenceEnd: finding.evidenceEnd,
      evidence: finding.evidence,
      suggestedAction: finding.suggestedAction,
      ...(finding.resolutionReason ? { resolutionReason: finding.resolutionReason } : {}),
      ...(finding.resolvedAt ? { resolvedAt: finding.resolvedAt.toISOString() } : {}),
      createdAt: finding.createdAt.toISOString(),
      updatedAt: finding.updatedAt.toISOString(),
    };
  }

  private toFinalizationTask(
    task: import('@prisma/client').StudioFinalizationOutboxTask,
  ): StudioFinalizationTaskResponse {
    return {
      id: task.id,
      projectId: task.projectId,
      revisionId: task.revisionId,
      chapterNumber: task.chapterNumber,
      type: task.type.toLowerCase() as StudioFinalizationTaskResponse['type'],
      status: task.status.toLowerCase() as StudioFinalizationTaskResponse['status'],
      attemptCount: task.attemptCount,
      ...(task.lastError ? { lastError: task.lastError } : {}),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
