import { Controller, Req } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { studioContract as c } from '@repo/contracts';
import type { AuthenticatedRequest } from '@app/auth';
import { StudioService } from './studio.service';

@Controller()
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

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
}
