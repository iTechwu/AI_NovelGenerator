import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema } from '../base';
import {
  CreateStudioProjectSchema,
  CreateStudioChapterDraftSchema,
  CreateStudioAuthorRevisionSchema,
  GenerationJobSchema,
  StudioBlueprintSchema,
  StudioChapterPlanSchema,
  StudioChapterRevisionSchema,
  StudioChapterRevisionListQuerySchema,
  StudioChapterRevisionListResponseSchema,
  StudioChapterRevisionDiffSchema,
  StudioChapterFinalizationSchema,
  CreateStudioFactChangeSchema,
  ResolveStudioFactChangeSchema,
  StudioFactChangeListQuerySchema,
  StudioFactChangeListResponseSchema,
  StudioFactChangeSchema,
  StudioFactListQuerySchema,
  StudioFactListResponseSchema,
  StudioReviewFindingListQuerySchema,
  StudioReviewFindingListResponseSchema,
  StudioReviewFindingSchema,
  ResolveStudioReviewFindingSchema,
  StudioProjectListQuerySchema,
  StudioProjectListResponseSchema,
  UpdateStudioChapterPlanSchema,
  UpdateStudioBlueprintSchema,
} from '../schemas/studio.schema';

const c = initContract();

export const studioContract = c.router(
  {
    listProjects: {
      method: 'GET',
      path: '/projects',
      query: StudioProjectListQuerySchema,
      responses: {
        200: ApiResponseSchema(StudioProjectListResponseSchema),
      },
      summary: 'List the current author writing projects',
    },
    createProject: {
      method: 'POST',
      path: '/projects',
      body: CreateStudioProjectSchema,
      responses: {
        202: ApiResponseSchema(GenerationJobSchema),
      },
      summary: 'Create a writing project and start its generation job',
    },
    getBlueprint: {
      method: 'GET',
      path: '/projects/:projectId/blueprint',
      pathParams: z.object({ projectId: z.string().uuid() }),
      responses: {
        200: ApiResponseSchema(StudioBlueprintSchema),
      },
      summary: 'Get the latest editable blueprint for the current author project',
    },
    updateBlueprint: {
      method: 'PUT',
      path: '/projects/:projectId/blueprint',
      pathParams: z.object({ projectId: z.string().uuid() }),
      body: UpdateStudioBlueprintSchema,
      responses: {
        200: ApiResponseSchema(StudioBlueprintSchema),
      },
      summary: 'Save an editable project blueprint',
    },
    confirmBlueprint: {
      method: 'POST',
      path: '/projects/:projectId/blueprint/confirm',
      pathParams: z.object({ projectId: z.string().uuid() }),
      body: z.object({}),
      responses: {
        200: ApiResponseSchema(StudioBlueprintSchema),
      },
      summary: 'Confirm the latest project blueprint',
    },
    getChapterPlan: {
      method: 'GET',
      path: '/projects/:projectId/chapters/:chapterNumber/plan',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
      }),
      responses: {
        200: ApiResponseSchema(StudioChapterPlanSchema),
      },
      summary: 'Get the latest chapter plan for the current author project',
    },
    saveChapterPlan: {
      method: 'PUT',
      path: '/projects/:projectId/chapters/:chapterNumber/plan',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
      }),
      body: UpdateStudioChapterPlanSchema,
      responses: {
        200: ApiResponseSchema(StudioChapterPlanSchema),
      },
      summary: 'Save a structured chapter plan from the confirmed blueprint',
    },
    confirmChapterPlan: {
      method: 'POST',
      path: '/projects/:projectId/chapters/:chapterNumber/plan/confirm',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
      }),
      body: z.object({}),
      responses: {
        200: ApiResponseSchema(StudioChapterPlanSchema),
      },
      summary: 'Confirm the current chapter plan before drafting',
    },
    createChapterDraft: {
      method: 'POST',
      path: '/projects/:projectId/chapters/:chapterNumber/drafts',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
      }),
      body: CreateStudioChapterDraftSchema,
      responses: {
        202: ApiResponseSchema(GenerationJobSchema),
      },
      summary: 'Generate an immutable draft from a confirmed chapter plan',
    },
    getChapterRevision: {
      method: 'GET',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
      }),
      responses: {
        200: ApiResponseSchema(StudioChapterRevisionSchema),
      },
      summary: 'Get an immutable chapter draft revision',
    },
    listChapterRevisions: {
      method: 'GET',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
      }),
      query: StudioChapterRevisionListQuerySchema,
      responses: {
        200: ApiResponseSchema(StudioChapterRevisionListResponseSchema),
      },
      summary: 'List immutable draft revisions and the current draft pointer',
    },
    restoreChapterRevision: {
      method: 'POST',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId/restore',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
      }),
      body: z.object({}),
      responses: {
        200: ApiResponseSchema(StudioChapterRevisionSchema),
      },
      summary: 'Set an immutable draft revision as the current chapter draft',
    },
    createAuthorChapterRevision: {
      method: 'POST',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId/author-revisions',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
      }),
      body: CreateStudioAuthorRevisionSchema,
      responses: { 201: ApiResponseSchema(StudioChapterRevisionSchema) },
      summary: 'Create an immutable author revision from the current chapter draft',
    },
    finalizeChapterRevision: {
      method: 'POST',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId/finalize',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
      }),
      body: z.object({}),
      responses: { 201: ApiResponseSchema(StudioChapterFinalizationSchema) },
      summary: 'Finalize the current draft after all fact changes are resolved',
    },
    compareChapterRevisions: {
      method: 'GET',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId/compare/:comparisonRevisionId',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
        comparisonRevisionId: z.string().uuid(),
      }),
      responses: {
        200: ApiResponseSchema(StudioChapterRevisionDiffSchema),
      },
      summary: 'Compare two immutable chapter draft revisions',
    },
    listFacts: {
      method: 'GET',
      path: '/projects/:projectId/facts',
      pathParams: z.object({ projectId: z.string().uuid() }),
      query: StudioFactListQuerySchema,
      responses: { 200: ApiResponseSchema(StudioFactListResponseSchema) },
      summary: 'List confirmed project facts available as change targets',
    },
    listFactChanges: {
      method: 'GET',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId/fact-changes',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
      }),
      query: StudioFactChangeListQuerySchema,
      responses: { 200: ApiResponseSchema(StudioFactChangeListResponseSchema) },
      summary: 'List pending and resolved fact changes for a chapter draft',
    },
    createFactChange: {
      method: 'POST',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId/fact-changes',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
      }),
      body: CreateStudioFactChangeSchema,
      responses: { 201: ApiResponseSchema(StudioFactChangeSchema) },
      summary: 'Create a fact change proposal for a chapter draft',
    },
    resolveFactChange: {
      method: 'POST',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId/fact-changes/:changeId/decision',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
        changeId: z.string().uuid(),
      }),
      body: ResolveStudioFactChangeSchema,
      responses: { 200: ApiResponseSchema(StudioFactChangeSchema) },
      summary: 'Accept, edit, or reject a proposed fact change',
    },
    listReviewFindings: {
      method: 'GET',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId/review-findings',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
      }),
      query: StudioReviewFindingListQuerySchema,
      responses: { 200: ApiResponseSchema(StudioReviewFindingListResponseSchema) },
      summary: 'List persistent review findings for a chapter revision',
    },
    resolveReviewFinding: {
      method: 'POST',
      path: '/projects/:projectId/chapters/:chapterNumber/revisions/:revisionId/review-findings/:findingId/decision',
      pathParams: z.object({
        projectId: z.string().uuid(),
        chapterNumber: z.coerce.number().int().positive(),
        revisionId: z.string().uuid(),
        findingId: z.string().uuid(),
      }),
      body: ResolveStudioReviewFindingSchema,
      responses: { 200: ApiResponseSchema(StudioReviewFindingSchema) },
      summary: 'Resolve, ignore, or record an intentional hard-fact change',
    },
    getJob: {
      method: 'GET',
      path: '/jobs/:jobId',
      pathParams: z.object({ jobId: z.string().uuid() }),
      responses: {
        200: ApiResponseSchema(GenerationJobSchema),
      },
      summary: 'Get the current generation job state',
    },
    retryJob: {
      method: 'POST',
      path: '/jobs/:jobId/retry',
      pathParams: z.object({ jobId: z.string().uuid() }),
      body: z.object({}),
      responses: {
        202: ApiResponseSchema(GenerationJobSchema),
      },
      summary: 'Retry a failed or interrupted generation job from its durable checkpoint',
    },
  },
  { pathPrefix: '/studio' },
);
