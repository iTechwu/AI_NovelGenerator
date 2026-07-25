import { Controller, Get, Headers, Req, Res } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { studioContract as c } from '@repo/contracts';
import type { AuthenticatedRequest } from '@app/auth';
import { StudioService } from './studio.service';
import { StudioProjectEventStreamParamsSchema } from '@repo/contracts';
import type { FastifyReply } from 'fastify';

@Controller()
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  // SSE is a transport projection; replay and validation remain in the ts-rest event API.
  @Get('/studio/projects/:projectId/events/stream')
  async streamProjectEvents(
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
    @Headers('last-event-id') lastEventId?: string,
  ) {
    const { projectId } = StudioProjectEventStreamParamsSchema.parse(request.params);
    const abortController = new AbortController();
    request.raw.once('close', () => abortController.abort());
    reply.sse(
      this.studioService.streamProjectEvents(
        request.userId,
        projectId,
        abortController.signal,
        lastEventId,
      ),
    );
  }

  @TsRestHandler(c.listProjects)
  async listProjects(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listProjects, async ({ query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listProjects(request.userId, query),
      },
    }));
  }

  @TsRestHandler(c.previewProjectImport)
  async previewProjectImport(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.previewProjectImport, async ({ body }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.previewProjectImport(request.userId, body),
      },
    }));
  }

  @TsRestHandler(c.confirmProjectImport)
  async confirmProjectImport(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.confirmProjectImport, async ({ params, body }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.confirmProjectImport(request.userId, params.importId, body),
      },
    }));
  }

  @TsRestHandler(c.listStandaloneScreenplayScenes)
  async listStandaloneScreenplayScenes(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listStandaloneScreenplayScenes, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listStandaloneScreenplayScenes(
          request.userId,
          params.projectId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.saveStandaloneScreenplayScene)
  async saveStandaloneScreenplayScene(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.saveStandaloneScreenplayScene, async ({ params, body }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.saveStandaloneScreenplayScene(
          request.userId,
          params.projectId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.listStandaloneScreenplayRevisions)
  async listStandaloneScreenplayRevisions(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listStandaloneScreenplayRevisions, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listStandaloneScreenplayRevisions(
          request.userId,
          params.projectId,
          params.sceneId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.createStandaloneScreenplayRevision)
  async createStandaloneScreenplayRevision(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.createStandaloneScreenplayRevision, async ({ params, body }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.createStandaloneScreenplayRevision(
          request.userId,
          params.projectId,
          params.sceneId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.exportStandaloneScreenplay)
  async exportStandaloneScreenplay(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.exportStandaloneScreenplay, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.exportStandaloneScreenplay(
          request.userId,
          params.projectId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.listAdaptations)
  async listAdaptations(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listAdaptations, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listAdaptations(request.userId, params.projectId, query),
      },
    }));
  }

  @TsRestHandler(c.createAdaptation)
  async createAdaptation(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.createAdaptation, async ({ params, body }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.createAdaptation(request.userId, params.projectId, body),
      },
    }));
  }

  @TsRestHandler(c.updateAdaptationBrief)
  async updateAdaptationBrief(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.updateAdaptationBrief, async ({ params, body }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.updateAdaptationBrief(
          request.userId,
          params.adaptationId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.confirmAdaptationBrief)
  async confirmAdaptationBrief(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.confirmAdaptationBrief, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.confirmAdaptationBrief(request.userId, params.adaptationId),
      },
    }));
  }

  @TsRestHandler(c.listAdaptationSourceChapters)
  async listAdaptationSourceChapters(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listAdaptationSourceChapters, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listAdaptationSourceChapters(
          request.userId,
          params.adaptationId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.listAdaptationDecisions)
  async listAdaptationDecisions(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listAdaptationDecisions, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listAdaptationDecisions(
          request.userId,
          params.adaptationId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.createAdaptationDecision)
  async createAdaptationDecision(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.createAdaptationDecision, async ({ params, body }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.createAdaptationDecision(
          request.userId,
          params.adaptationId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.resolveAdaptationDecision)
  async resolveAdaptationDecision(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.resolveAdaptationDecision, async ({ params, body }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.resolveAdaptationDecision(
          request.userId,
          params.adaptationId,
          params.decisionId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.startScenePlanning)
  async startScenePlanning(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.startScenePlanning, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.startScenePlanning(request.userId, params.adaptationId),
      },
    }));
  }

  @TsRestHandler(c.listScenePlans)
  async listScenePlans(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listScenePlans, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listScenePlans(
          request.userId,
          params.adaptationId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.startScriptWriting)
  async startScriptWriting(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.startScriptWriting, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.startScriptWriting(request.userId, params.adaptationId),
      },
    }));
  }

  @TsRestHandler(c.startReviewReady)
  async startReviewReady(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.startReviewReady, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.startReviewReady(request.userId, params.adaptationId),
      },
    }));
  }

  @TsRestHandler(c.startDeliverable)
  async startDeliverable(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.startDeliverable, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.startDeliverable(request.userId, params.adaptationId),
      },
    }));
  }

  @TsRestHandler(c.saveScenePlan)
  async saveScenePlan(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.saveScenePlan, async ({ params, body }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.saveScenePlan(
          request.userId,
          params.adaptationId,
          params.episodeNumber,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.confirmScenePlan)
  async confirmScenePlan(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.confirmScenePlan, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.confirmScenePlan(
          request.userId,
          params.adaptationId,
          params.episodeNumber,
        ),
      },
    }));
  }

  @TsRestHandler(c.listSourceSceneMappings)
  async listSourceSceneMappings(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listSourceSceneMappings, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listSourceSceneMappings(
          request.userId,
          params.adaptationId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.createSourceSceneMapping)
  async createSourceSceneMapping(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.createSourceSceneMapping, async ({ params, body }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.createSourceSceneMapping(
          request.userId,
          params.adaptationId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.resolveSourceSceneMapping)
  async resolveSourceSceneMapping(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.resolveSourceSceneMapping, async ({ params, body }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.resolveSourceSceneMapping(
          request.userId,
          params.adaptationId,
          params.mappingId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.listScreenplaySceneRevisions)
  async listScreenplaySceneRevisions(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listScreenplaySceneRevisions, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listScreenplaySceneRevisions(
          request.userId,
          params.adaptationId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.createScreenplaySceneRevision)
  async createScreenplaySceneRevision(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.createScreenplaySceneRevision, async ({ params, body }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.createScreenplaySceneRevision(
          request.userId,
          params.adaptationId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.exportAdaptation)
  async exportAdaptation(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.exportAdaptation, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.exportAdaptation(
          request.userId,
          params.adaptationId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.listAdaptationSourceDrift)
  async listAdaptationSourceDrift(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listAdaptationSourceDrift, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listAdaptationSourceDrift(
          request.userId,
          params.adaptationId,
        ),
      },
    }));
  }

  @TsRestHandler(c.markSourceSceneMappingsStale)
  async markSourceSceneMappingsStale(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.markSourceSceneMappingsStale, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.markSourceSceneMappingsStale(
          request.userId,
          params.adaptationId,
        ),
      },
    }));
  }

  @TsRestHandler(c.exportProject)
  async exportProject(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.exportProject, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.exportProject(request.userId, params.projectId, query),
      },
    }));
  }

  @TsRestHandler(c.getProjectOverview)
  async getProjectOverview(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.getProjectOverview, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.getProjectOverview(request.userId, params.projectId),
      },
    }));
  }

  @TsRestHandler(c.listProjectEvents)
  async listProjectEvents(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listProjectEvents, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listProjectEvents(request.userId, params.projectId, query),
      },
    }));
  }

  @TsRestHandler(c.listFinalizationTasks)
  async listFinalizationTasks(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listFinalizationTasks, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listFinalizationTasks(
          request.userId,
          params.projectId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.retryFinalizationTask)
  async retryFinalizationTask(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.retryFinalizationTask, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.retryFinalizationTask(
          request.userId,
          params.projectId,
          params.taskId,
        ),
      },
    }));
  }

  @TsRestHandler(c.createProject)
  async createProject(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.createProject, async ({ body }) => ({
      status: 202 as const,
      body: {
        code: 202,
        msg: 'accepted',
        data: await this.studioService.createProject(request.userId, body),
      },
    }));
  }

  @TsRestHandler(c.getBlueprint)
  async getBlueprint(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.getBlueprint, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.getBlueprint(request.userId, params.projectId),
      },
    }));
  }

  @TsRestHandler(c.listBlueprints)
  async listBlueprints(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listBlueprints, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listBlueprints(request.userId, params.projectId, query),
      },
    }));
  }

  @TsRestHandler(c.updateBlueprint)
  async updateBlueprint(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.updateBlueprint, async ({ params, body }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.updateBlueprint(request.userId, params.projectId, body),
      },
    }));
  }

  @TsRestHandler(c.confirmBlueprint)
  async confirmBlueprint(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.confirmBlueprint, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.confirmBlueprint(request.userId, params.projectId),
      },
    }));
  }

  @TsRestHandler(c.restoreBlueprint)
  async restoreBlueprint(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.restoreBlueprint, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.restoreBlueprint(
          request.userId,
          params.projectId,
          params.blueprintId,
        ),
      },
    }));
  }

  @TsRestHandler(c.getChapterPlan)
  async getChapterPlan(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.getChapterPlan, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.getChapterPlan(
          request.userId,
          params.projectId,
          params.chapterNumber,
        ),
      },
    }));
  }

  @TsRestHandler(c.saveChapterPlan)
  async saveChapterPlan(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.saveChapterPlan, async ({ params, body }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.saveChapterPlan(
          request.userId,
          params.projectId,
          params.chapterNumber,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.confirmChapterPlan)
  async confirmChapterPlan(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.confirmChapterPlan, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.confirmChapterPlan(
          request.userId,
          params.projectId,
          params.chapterNumber,
        ),
      },
    }));
  }

  @TsRestHandler(c.createChapterDraft)
  async createChapterDraft(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.createChapterDraft, async ({ params, body }) => ({
      status: 202 as const,
      body: {
        code: 202,
        msg: 'accepted',
        data: await this.studioService.createChapterDraft(
          request.userId,
          params.projectId,
          params.chapterNumber,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.getChapterRevision)
  async getChapterRevision(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.getChapterRevision, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.getChapterRevision(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
        ),
      },
    }));
  }

  @TsRestHandler(c.listChapterRevisions)
  async listChapterRevisions(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listChapterRevisions, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listChapterRevisions(
          request.userId,
          params.projectId,
          params.chapterNumber,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.restoreChapterRevision)
  async restoreChapterRevision(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.restoreChapterRevision, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.restoreChapterRevision(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
        ),
      },
    }));
  }

  @TsRestHandler(c.createAuthorChapterRevision)
  async createAuthorChapterRevision(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.createAuthorChapterRevision, async ({ params, body }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.createAuthorChapterRevision(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.finalizeChapterRevision)
  async finalizeChapterRevision(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.finalizeChapterRevision, async ({ params }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.finalizeChapterRevision(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
        ),
      },
    }));
  }

  @TsRestHandler(c.restoreFinalChapterRevision)
  async restoreFinalChapterRevision(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.restoreFinalChapterRevision, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.restoreFinalChapterRevision(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
        ),
      },
    }));
  }

  @TsRestHandler(c.listChapterFinalizations)
  async listChapterFinalizations(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listChapterFinalizations, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listChapterFinalizations(
          request.userId,
          params.projectId,
          params.chapterNumber,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.compareChapterRevisions)
  async compareChapterRevisions(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.compareChapterRevisions, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.compareChapterRevisions(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
          params.comparisonRevisionId,
        ),
      },
    }));
  }

  @TsRestHandler(c.listFactChanges)
  async listFactChanges(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listFactChanges, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listFactChanges(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.listFacts)
  async listFacts(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listFacts, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listFacts(request.userId, params.projectId, query),
      },
    }));
  }

  @TsRestHandler(c.createFactChange)
  async createFactChange(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.createFactChange, async ({ params, body }) => ({
      status: 201 as const,
      body: {
        code: 201,
        msg: 'created',
        data: await this.studioService.createFactChange(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.resolveFactChange)
  async resolveFactChange(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.resolveFactChange, async ({ params, body }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.resolveFactChange(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
          params.changeId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.listReviewFindings)
  async listReviewFindings(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.listReviewFindings, async ({ params, query }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.listReviewFindings(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
          query,
        ),
      },
    }));
  }

  @TsRestHandler(c.resolveReviewFinding)
  async resolveReviewFinding(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.resolveReviewFinding, async ({ params, body }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.resolveReviewFinding(
          request.userId,
          params.projectId,
          params.chapterNumber,
          params.revisionId,
          params.findingId,
          body,
        ),
      },
    }));
  }

  @TsRestHandler(c.getJob)
  async getJob(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.getJob, async ({ params }) => ({
      status: 200 as const,
      body: {
        code: 200,
        msg: 'ok',
        data: await this.studioService.getJob(request.userId, params.jobId),
      },
    }));
  }

  @TsRestHandler(c.retryJob)
  async retryJob(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.retryJob, async ({ params }) => ({
      status: 202 as const,
      body: {
        code: 202,
        msg: 'accepted',
        data: await this.studioService.retryJob(request.userId, params.jobId),
      },
    }));
  }

  @TsRestHandler(c.cancelJob)
  async cancelJob(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(c.cancelJob, async ({ params }) => ({
      status: 202 as const,
      body: {
        code: 202,
        msg: 'accepted',
        data: await this.studioService.cancelJob(request.userId, params.jobId),
      },
    }));
  }
}
