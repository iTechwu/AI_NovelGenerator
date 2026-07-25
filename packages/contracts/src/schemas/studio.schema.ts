import { z } from 'zod';
import { PaginatedResponseSchema, PaginationQuerySchema } from '../base';

export const ProjectFormatSchema = z.enum(['novel', 'screenplay']);

export const GenerationJobStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
]);

export const CreateStudioProjectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  // A standalone screenplay starts from its own premise. Adaptation remains a
  // separate, source-snapshot workflow and is never inferred from this field.
  format: ProjectFormatSchema.default('novel'),
  genre: z.string().trim().min(1).max(80),
  premise: z.string().trim().min(20).max(4_000),
  chapterCount: z.coerce.number().int().min(1).max(500).default(20),
  targetWordsPerChapter: z.coerce.number().int().min(500).max(20_000).default(3_000),
  guidance: z.string().trim().max(2_000).optional().default(''),
  generateOutline: z.boolean().default(true),
});

export const StudioProjectSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  format: ProjectFormatSchema,
  genre: z.string(),
  chapterCount: z.number().int(),
  targetWordsPerChapter: z.number().int(),
});

export const PreviewStudioProjectImportSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  format: z.enum(['txt', 'md', 'docx']).optional(),
  contentBase64: z.string().base64().min(1).max(10_500_000),
});

export const StudioProjectImportChapterPreviewSchema = z.object({
  chapterNumber: z.number().int().positive(),
  title: z.string(),
  characterCount: z.number().int().nonnegative(),
  excerpt: z.string(),
});

export const StudioProjectImportFactCandidateSchema = z.object({
  id: z.string().length(64),
  chapterNumber: z.number().int().positive(),
  factType: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(200),
  predicate: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(2_000),
  evidence: z.string().trim().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const StudioProjectImportPreviewDataSchema = z.object({
  chapters: z.array(StudioProjectImportChapterPreviewSchema).min(1).max(500),
  factCandidates: z.array(StudioProjectImportFactCandidateSchema).max(200).default([]),
  acceptedFactCandidateIds: z.array(z.string().length(64)).max(200).default([]),
});

export const StudioProjectImportPreviewSchema = z
  .object({
    importId: z.string().uuid(),
    filename: z.string(),
    sourceFormat: z.enum(['txt', 'md', 'docx']),
    contentHash: z.string().length(64),
  })
  .merge(StudioProjectImportPreviewDataSchema.pick({ chapters: true, factCandidates: true }));

export const ConfirmStudioProjectImportSchema = z.object({
  title: z.string().trim().min(1).max(120),
  genre: z.string().trim().min(1).max(80),
  guidance: z.string().trim().max(2_000).optional().default(''),
  targetWordsPerChapter: z.coerce.number().int().min(500).max(20_000).default(3_000),
  acceptedFactCandidateIds: z.array(z.string().length(64)).max(200).default([]),
});

export const StudioAdaptationTargetFormatSchema = z.enum(['series', 'short_drama']);
export const StudioAdaptationStatusSchema = z.enum([
  'brief_draft',
  'blueprint_review',
  'scene_planning',
  'script_writing',
  'review_ready',
  'deliverable',
]);

export const CreateStudioAdaptationSchema = z.object({
  targetFormat: StudioAdaptationTargetFormatSchema.default('series'),
  episodeCount: z.coerce.number().int().min(1).max(100).default(12),
  minutesPerEpisode: z.coerce.number().int().min(1).max(120).default(45),
  targetAudience: z.string().trim().max(500).optional().default(''),
  adaptationGoal: z.string().trim().max(10_000).optional().default(''),
  mustPreserve: z.string().trim().max(10_000).optional().default(''),
  rightsConfirmed: z.literal(true),
});

export const UpdateStudioAdaptationBriefSchema = z.object({
  targetFormat: StudioAdaptationTargetFormatSchema,
  episodeCount: z.coerce.number().int().min(1).max(100),
  minutesPerEpisode: z.coerce.number().int().min(1).max(120),
  targetAudience: z.string().trim().max(500),
  adaptationGoal: z.string().trim().max(10_000),
  mustPreserve: z.string().trim().max(10_000),
});

export const StudioAdaptationSourceSnapshotSchema = z.object({
  id: z.string().uuid(),
  sourceProjectId: z.string().uuid(),
  sourceProjectTitle: z.string(),
  sourceProjectUpdatedAt: z.string().datetime(),
  sourceChapterCount: z.number().int().positive(),
  createdAt: z.string().datetime(),
});

export const StudioAdaptationProjectSchema = z.object({
  id: z.string().uuid(),
  sourceProjectId: z.string().uuid(),
  targetFormat: StudioAdaptationTargetFormatSchema,
  episodeCount: z.number().int().positive(),
  minutesPerEpisode: z.number().int().positive(),
  targetAudience: z.string(),
  adaptationGoal: z.string(),
  mustPreserve: z.string(),
  status: StudioAdaptationStatusSchema,
  sourceSnapshot: StudioAdaptationSourceSnapshotSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// The immutable per-chapter copy captured when an adaptation is created.
// Exposed standalone so blueprint decisions, scene planning and source-scene
// mapping can anchor to a specific chapter without re-reading the source novel.
export const StudioAdaptationSourceChapterSchema = z.object({
  id: z.string().uuid(),
  snapshotId: z.string().uuid(),
  sourceRevisionId: z.string().uuid(),
  chapterNumber: z.number().int().positive(),
  title: z.string(),
  content: z.string(),
  contentHash: z.string(),
  wordCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const StudioAdaptationSourceChapterListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});
export const StudioAdaptationSourceChapterListResponseSchema = PaginatedResponseSchema(
  StudioAdaptationSourceChapterSchema,
);

export const StudioAdaptationListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});
export const StudioAdaptationListResponseSchema = PaginatedResponseSchema(
  StudioAdaptationProjectSchema,
);

export const StudioAdaptationDecisionTypeSchema = z.enum([
  'cut',
  'merge',
  'reorder',
  'pov_change',
  'expand',
]);
export const StudioAdaptationDecisionImpactSchema = z.enum(['low', 'medium', 'high']);
export const StudioAdaptationDecisionStatusSchema = z.enum([
  'proposed',
  'accepted',
  'edited',
  'rejected',
]);

export const CreateStudioAdaptationDecisionSchema = z.object({
  sourceChapterId: z.string().uuid(),
  type: StudioAdaptationDecisionTypeSchema,
  impact: StudioAdaptationDecisionImpactSchema,
  proposal: z.string().trim().min(1).max(10_000),
  rationale: z.string().trim().min(1).max(10_000),
});

export const ResolveStudioAdaptationDecisionSchema = z.object({
  outcome: z.enum(['accepted', 'edited', 'rejected']),
  resolutionReason: z.string().trim().min(1).max(10_000),
});

export const StudioAdaptationDecisionSchema = z.object({
  id: z.string().uuid(),
  adaptationId: z.string().uuid(),
  sourceSnapshotId: z.string().uuid(),
  sourceChapter: z.object({
    id: z.string().uuid(),
    chapterNumber: z.number().int().positive(),
    title: z.string(),
  }),
  type: StudioAdaptationDecisionTypeSchema,
  impact: StudioAdaptationDecisionImpactSchema,
  proposal: z.string(),
  rationale: z.string(),
  status: StudioAdaptationDecisionStatusSchema,
  resolutionReason: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudioAdaptationDecisionListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});
export const StudioAdaptationDecisionListResponseSchema = PaginatedResponseSchema(
  StudioAdaptationDecisionSchema,
);

export const StudioScenePlanActSchema = z.enum(['setup', 'development', 'twist', 'resolution']);

// A single scene beat inside a per-episode plan. `sourceChapterIds` anchors the
// scene to immutable snapshot chapters so screenplay generation and source-scene
// mapping remain traceable (PRD P13).
export const StudioScenePlanSceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  synopsis: z.string().trim().max(5000),
  act: StudioScenePlanActSchema.optional(),
  sourceChapterIds: z.array(z.string().uuid()).default([]),
});

export const StudioScenePlanSceneOutlineSchema = z
  .array(StudioScenePlanSceneSchema)
  .max(200)
  .default([]);

export const StudioScenePlanSchema = z.object({
  id: z.string().uuid(),
  adaptationId: z.string().uuid(),
  episodeNumber: z.number().int().positive(),
  title: z.string(),
  synopsis: z.string(),
  sceneOutline: StudioScenePlanSceneOutlineSchema,
  needsReview: z.boolean(),
  confirmedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SaveStudioScenePlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  synopsis: z.string().trim().min(1).max(5000),
  sceneOutline: StudioScenePlanSceneOutlineSchema,
});

export const StudioScenePlanListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});
export const StudioScenePlanListResponseSchema = PaginatedResponseSchema(StudioScenePlanSchema);

export const StudioSourceMappingStatusSchema = z.enum(['proposed', 'confirmed', 'stale']);

export const StudioSourceSceneMappingSchema = z.object({
  id: z.string().uuid(),
  adaptationId: z.string().uuid(),
  scenePlanId: z.string().uuid(),
  episodeNumber: z.number().int().positive(),
  sceneNumber: z.number().int().positive(),
  sourceChapter: z.object({
    id: z.string().uuid(),
    chapterNumber: z.number().int().positive(),
    title: z.string(),
  }),
  evidenceAnchor: z.string().nullable(),
  status: StudioSourceMappingStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateStudioSourceSceneMappingSchema = z.object({
  episodeNumber: z.coerce.number().int().min(1),
  sceneNumber: z.coerce.number().int().min(1),
  sourceChapterId: z.string().uuid(),
  evidenceAnchor: z.string().trim().max(5000).optional(),
});

export const ResolveStudioSourceSceneMappingSchema = z.object({
  status: z.enum(['confirmed', 'stale']),
  reason: z.string().trim().min(1).max(5000),
});

export const StudioSourceSceneMappingListQuerySchema = PaginationQuerySchema.extend({
  episodeNumber: z.coerce.number().int().min(1).optional(),
});
export const StudioSourceSceneMappingListResponseSchema = PaginatedResponseSchema(
  StudioSourceSceneMappingSchema,
);

export const StudioScreenplayRevisionSourceSchema = z.enum(['author', 'ai']);

export const StudioScreenplaySceneRevisionSchema = z.object({
  id: z.string().uuid(),
  adaptationId: z.string().uuid(),
  scenePlanId: z.string().uuid(),
  episodeNumber: z.number().int().positive(),
  sceneNumber: z.number().int().positive(),
  source: StudioScreenplayRevisionSourceSchema,
  sourceRevisionId: z.string().uuid().nullable(),
  version: z.number().int().positive(),
  content: z.string(),
  contentHash: z.string(),
  wordCount: z.number().int().nonnegative(),
  editSummary: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const CreateStudioScreenplaySceneRevisionSchema = z.object({
  episodeNumber: z.coerce.number().int().min(1),
  sceneNumber: z.coerce.number().int().min(1),
  sourceRevisionId: z.string().uuid().optional(),
  content: z.string().trim().min(1).max(50_000),
  editSummary: z.string().trim().max(500).optional(),
});

export const StudioScreenplaySceneRevisionListQuerySchema = PaginationQuerySchema.extend({
  episodeNumber: z.coerce.number().int().min(1).optional(),
  sceneNumber: z.coerce.number().int().min(1).optional(),
});
export const StudioScreenplaySceneRevisionListResponseSchema = PaginatedResponseSchema(
  StudioScreenplaySceneRevisionSchema,
);

export const StudioAdaptationExportQuerySchema = z.object({
  format: z.enum(['fountain', 'txt']).default('fountain'),
});

// PRD AC-13: exported screenplay records format, version and source snapshot.
export const StudioAdaptationExportSchema = z.object({
  filename: z.string(),
  contentType: z.literal('text/plain'),
  content: z.string(),
  sourceSnapshotId: z.string().uuid(),
  episodeCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});

// Independent screenplay scenes never reference an adaptation or source
// snapshot. Their plan remains editable while every Fountain save is immutable.
export const StudioStandaloneScreenplaySceneStatusSchema = z.enum(['draft', 'confirmed']);

export const StudioStandaloneScreenplaySceneSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  episodeNumber: z.number().int().positive(),
  sceneNumber: z.number().int().positive(),
  title: z.string(),
  synopsis: z.string(),
  status: StudioStandaloneScreenplaySceneStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SaveStudioStandaloneScreenplaySceneSchema = z.object({
  episodeNumber: z.coerce.number().int().min(1).max(100),
  sceneNumber: z.coerce.number().int().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  synopsis: z.string().trim().max(5_000).default(''),
  status: StudioStandaloneScreenplaySceneStatusSchema.default('draft'),
});

export const StudioStandaloneScreenplaySceneListQuerySchema = PaginationQuerySchema.extend({
  episodeNumber: z.coerce.number().int().min(1).optional(),
});
export const StudioStandaloneScreenplaySceneListResponseSchema = PaginatedResponseSchema(
  StudioStandaloneScreenplaySceneSchema,
);

export const StudioStandaloneScreenplayRevisionSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  sceneId: z.string().uuid(),
  version: z.number().int().positive(),
  content: z.string(),
  contentHash: z.string(),
  wordCount: z.number().int().nonnegative(),
  editSummary: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const CreateStudioStandaloneScreenplayRevisionSchema = z.object({
  content: z.string().trim().min(1).max(50_000),
  editSummary: z.string().trim().max(500).optional(),
});

export const StudioStandaloneScreenplayRevisionListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});
export const StudioStandaloneScreenplayRevisionListResponseSchema = PaginatedResponseSchema(
  StudioStandaloneScreenplayRevisionSchema,
);

export const StudioStandaloneScreenplayExportQuerySchema = z.object({
  format: z.enum(['fountain', 'txt']).default('fountain'),
});

export const StudioStandaloneScreenplayExportSchema = z.object({
  filename: z.string(),
  contentType: z.literal('text/plain'),
  content: z.string(),
  episodeCount: z.number().int().nonnegative(),
  sceneCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});

// PRD P13 来源更新复核: detect chapters finalized in the source novel AFTER the
// immutable snapshot was taken, so the author can re-review affected mappings.
export const StudioAdaptationSourceDriftSchema = z.object({
  snapshotChapterCount: z.number().int().nonnegative(),
  snapshotCreatedAt: z.string().datetime(),
  newChapters: z.array(
    z.object({
      chapterNumber: z.number().int().positive(),
      title: z.string(),
    }),
  ),
});

export const StudioAdaptationMarkStaleResponseSchema = z.object({
  markedStaleCount: z.number().int().nonnegative(),
});

export const StudioProjectImportResultSchema = z.object({
  importId: z.string().uuid(),
  project: StudioProjectSummarySchema,
  importedChapterCount: z.number().int().positive(),
  importedFactCount: z.number().int().nonnegative(),
});

export const StudioFactProposalSchema = z.object({
  operation: z.enum(['add', 'update', 'remove']),
  factType: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(200),
  predicate: z.string().trim().min(1).max(200),
  proposedValue: z.string().trim().max(20_000).default(''),
  rationale: z.string().trim().max(4_000).default(''),
  evidence: z.string().trim().max(10_000).default(''),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const StudioArtifactSchema = z.object({
  architecture: z.string().optional(),
  outline: z.string().optional(),
  chapterDraft: z.string().optional(),
  factChanges: z.array(StudioFactProposalSchema).optional(),
});

export const StudioBlueprintStatusSchema = z.enum(['draft', 'confirmed']);

export const StudioBlueprintSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  runId: z.string().uuid().optional(),
  version: z.number().int().positive(),
  status: StudioBlueprintStatusSchema,
  architecture: z.string(),
  outline: z.string(),
  source: z.enum(['ai', 'author']),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UpdateStudioBlueprintSchema = z.object({
  architecture: z.string().trim().min(1).max(100_000),
  outline: z.string().trim().max(100_000).default(''),
});

export const StudioBlueprintListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});
export const StudioBlueprintListResponseSchema = PaginatedResponseSchema(StudioBlueprintSchema);

export const StudioChapterPlanStatusSchema = z.enum(['draft', 'confirmed']);

export const StudioChapterPlanSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  blueprintId: z.string().uuid(),
  chapterNumber: z.number().int().positive(),
  version: z.number().int().positive(),
  status: StudioChapterPlanStatusSchema,
  needsReview: z.boolean(),
  title: z.string(),
  goal: z.string(),
  conflict: z.string(),
  characters: z.array(z.string()),
  location: z.string(),
  timeConstraint: z.string(),
  foreshadowing: z.string(),
  hook: z.string(),
  source: z.enum(['ai', 'author']),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UpdateStudioChapterPlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  goal: z.string().trim().min(1).max(10_000),
  conflict: z.string().trim().max(10_000).default(''),
  characters: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  location: z.string().trim().max(200).default(''),
  timeConstraint: z.string().trim().max(500).default(''),
  foreshadowing: z.string().trim().max(10_000).default(''),
  hook: z.string().trim().max(10_000).default(''),
});

export const CreateStudioChapterDraftSchema = z.object({
  prompt: z.string().trim().max(2_000).optional().default(''),
});

export const CreateStudioAuthorRevisionSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(200_000)
    .refine((value) => value.trim().length > 0, '正文不能为空'),
  editSummary: z.string().trim().max(2_000).optional().default(''),
});

export const StudioChapterRevisionSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  chapterPlanId: z.string().uuid(),
  runId: z.string().uuid().optional(),
  chapterNumber: z.number().int().positive(),
  version: z.number().int().positive(),
  status: z.enum(['draft', 'finalized', 'superseded']),
  content: z.string(),
  wordCount: z.number().int().nonnegative(),
  promptSummary: z.string(),
  editSummary: z.string().optional(),
  source: z.enum(['ai', 'author']),
  sourceRevisionId: z.string().uuid().optional(),
  schemaVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudioChapterFinalizationSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  revisionId: z.string().uuid(),
  chapterNumber: z.number().int().positive(),
  status: z.enum(['finalizing', 'finalized', 'failed', 'recoverable']),
  summaryStatus: z.enum(['pending', 'completed', 'failed']),
  indexStatus: z.enum(['pending', 'completed', 'failed']),
  finalizedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const StudioChapterFinalizationListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});
export const StudioChapterFinalizationListResponseSchema = PaginatedResponseSchema(
  StudioChapterFinalizationSchema,
);

export const StudioChapterRevisionListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});

export const StudioChapterRevisionListResponseSchema = PaginatedResponseSchema(
  StudioChapterRevisionSchema,
).extend({
  currentRevisionId: z.string().uuid().optional(),
  currentFinalRevisionId: z.string().uuid().optional(),
});

export const StudioChapterRevisionDiffSegmentSchema = z.object({
  type: z.enum(['unchanged', 'added', 'removed']),
  text: z.string(),
});

export const StudioChapterRevisionDiffSchema = z.object({
  baseRevisionId: z.string().uuid(),
  comparisonRevisionId: z.string().uuid(),
  segments: z.array(StudioChapterRevisionDiffSegmentSchema),
});

export const StudioBlueprintRestoreResultSchema = z.object({
  blueprint: StudioBlueprintSchema,
  affectedChapterNumbers: z.array(z.number().int().positive()),
});

export const StudioChapterFinalRestoreResultSchema = z.object({
  revision: StudioChapterRevisionSchema,
  restoredFactCount: z.number().int().nonnegative(),
  affectedChapterNumbers: z.array(z.number().int().positive()),
});

export const StudioFactChangeOperationSchema = z.enum(['add', 'update', 'remove']);
export const StudioFactChangeStatusSchema = z.enum([
  'proposed',
  'accepted_pending_finalization',
  'accepted',
  'rejected',
]);

export const StudioFactChangeSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  revisionId: z.string().uuid(),
  chapterNumber: z.number().int().positive(),
  factId: z.string().uuid().optional(),
  operation: StudioFactChangeOperationSchema,
  factType: z.string(),
  subject: z.string(),
  predicate: z.string(),
  proposedValue: z.string(),
  rationale: z.string(),
  evidence: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['ai', 'author']),
  status: StudioFactChangeStatusSchema,
  resolvedValue: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateStudioFactChangeSchema = z.object({
  factId: z.string().uuid().optional(),
  operation: StudioFactChangeOperationSchema,
  factType: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(200),
  predicate: z.string().trim().min(1).max(200),
  proposedValue: z.string().trim().max(20_000).default(''),
  rationale: z.string().trim().max(4_000).default(''),
  evidence: z.string().trim().max(10_000).default(''),
});

export const ResolveStudioFactChangeSchema = z.object({
  decision: z.enum(['accept', 'edit', 'reject']),
  resolvedValue: z.string().trim().max(20_000).optional(),
});

export const StudioFactChangeListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});

export const StudioFactChangeListResponseSchema = PaginatedResponseSchema(StudioFactChangeSchema);

export const StudioFactSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  factType: z.string(),
  subject: z.string(),
  predicate: z.string(),
  value: z.string(),
  effectiveChapter: z.number().int().positive(),
  status: z.literal('confirmed'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudioFactListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});

export const StudioFactListResponseSchema = PaginatedResponseSchema(StudioFactSchema);

export const StudioReviewFindingSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  revisionId: z.string().uuid(),
  chapterNumber: z.number().int().positive(),
  factId: z.string().uuid().optional(),
  ruleId: z.string(),
  severity: z.enum(['blocking', 'warning', 'info']),
  status: z.enum(['open', 'resolved', 'ignored', 'intentional_change']),
  evidenceStart: z.number().int().nonnegative(),
  evidenceEnd: z.number().int().nonnegative(),
  evidence: z.string(),
  suggestedAction: z.string(),
  resolutionReason: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ResolveStudioReviewFindingSchema = z
  .object({
    decision: z.enum(['resolve', 'ignore', 'intentional_change']),
    reason: z.string().trim().min(1).max(2_000),
    resolvedValue: z.string().trim().max(20_000).optional(),
  })
  .superRefine((input, context) => {
    if (input.decision === 'intentional_change' && !input.resolvedValue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resolvedValue'],
        message: '记录有意变更时必须填写新的事实值。',
      });
    }
  });

export const StudioReviewFindingListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});

export const StudioReviewFindingListResponseSchema =
  PaginatedResponseSchema(StudioReviewFindingSchema);

export const GenerationJobSchema = z.object({
  id: z.string().uuid(),
  project: StudioProjectSummarySchema,
  status: GenerationJobStatusSchema,
  progress: z.number().int().min(0).max(100),
  currentStep: z.string(),
  attemptCount: z.number().int().nonnegative().default(0),
  // Python's Pydantic serializer includes null for unset optional fields.
  // Normalize these fields so both runtime and API callers receive one shape.
  artifact: StudioArtifactSchema.nullish().transform((value) => value ?? undefined),
  revisionId: z.string().uuid().nullish().transform((value) => value ?? undefined),
  modelConfig: z.record(z.string(), z.string()).nullish().transform((value) => value ?? undefined),
  error: z.string().nullish().transform((value) => value ?? undefined),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudioProjectLatestRunSchema = z.object({
  id: z.string().uuid(),
  status: GenerationJobStatusSchema,
  progress: z.number().int().min(0).max(100),
  currentStep: z.string(),
  updatedAt: z.string().datetime(),
});

// Python runtime: LLM consistency review of a chapter vs setting/state/summary.
export const ConsistencyReviewRequestSchema = z.object({
  novelSetting: z.string().max(20_000).default(''),
  characterState: z.string().max(20_000).default(''),
  globalSummary: z.string().max(20_000).default(''),
  chapterText: z.string().min(1).max(200_000),
  plotArcs: z.string().max(10_000).default(''),
});
export const ConsistencyReviewResultSchema = z.object({
  report: z.string(),
});

// Python runtime: expand a chapter toward a target word count.
export const ChapterEnrichRequestSchema = z.object({
  chapterText: z.string().min(1).max(200_000),
  targetWords: z.number().int().min(100).max(20_000),
});
export const ChapterEnrichResultSchema = z.object({
  content: z.string(),
});

// Python runtime: parse a chapter blueprint into structured per-chapter info (no LLM).
export const ParsedChapterSchema = z.object({
  chapterNumber: z.number().int(),
  chapterTitle: z.string().default(''),
  chapterRole: z.string().default(''),
  chapterPurpose: z.string().default(''),
  suspenseLevel: z.string().default(''),
  foreshadowing: z.string().default(''),
  plotTwistLevel: z.string().default(''),
  chapterSummary: z.string().default(''),
});
export const BlueprintParseRequestSchema = z.object({
  blueprintText: z.string().min(1).max(200_000),
});
export const BlueprintParseResultSchema = z.object({
  chapters: z.array(ParsedChapterSchema),
});

// Python runtime: summarize recent chapters into precise context (LLM).
// chapterInfo / nextChapterInfo reuse the ParsedChapter shape from parse-blueprint.
export const ChapterSummarizeRequestSchema = z.object({
  chaptersText: z.array(z.string()).max(50),
  chapterNumber: z.number().int().min(1),
  chapterInfo: ParsedChapterSchema,
  nextChapterInfo: ParsedChapterSchema,
});
export const ChapterSummarizeResultSchema = z.object({
  summary: z.string(),
});

export const StudioProjectListItemSchema = StudioProjectSummarySchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  finalizedChapterCount: z.number().int().nonnegative(),
  confirmedFactCount: z.number().int().nonnegative(),
  blockingFindingCount: z.number().int().nonnegative(),
  latestRun: StudioProjectLatestRunSchema.optional(),
});

export const StudioProjectListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});

export const StudioProjectListResponseSchema = PaginatedResponseSchema(StudioProjectListItemSchema);

export const StudioProjectExportQuerySchema = z.object({
  format: z.enum(['txt', 'md']).default('md'),
  force: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((value) => value === true || value === 'true')
    .default(false),
  forceReason: z.string().trim().max(2_000).optional(),
});

export const StudioProjectExportSchema = z.object({
  filename: z.string(),
  contentType: z.enum(['text/plain', 'text/markdown']),
  content: z.string(),
  warnings: z.array(z.string()),
});

export const StudioProjectOverviewSchema = z.object({
  projectId: z.string().uuid(),
  finalizedChapterCount: z.number().int().nonnegative(),
  pendingChapterReviewNumbers: z.array(z.number().int().positive()).max(500),
  pendingFactChangeCount: z.number().int().nonnegative(),
  confirmedFactCount: z.number().int().nonnegative(),
  blockingFindingCount: z.number().int().nonnegative(),
  pendingFinalizationTaskCount: z.number().int().nonnegative(),
  failedFinalizationTaskCount: z.number().int().nonnegative(),
});

export const StudioProjectEventSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  type: z.enum(['generation_status', 'finalization_task_status', 'fact_change_decision']),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});

export const StudioProjectEventListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});
export const StudioProjectEventListResponseSchema =
  PaginatedResponseSchema(StudioProjectEventSchema);
export const StudioProjectEventStreamParamsSchema = z.object({ projectId: z.string().uuid() });

export const StudioFinalizationTaskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  revisionId: z.string().uuid(),
  chapterNumber: z.number().int().positive(),
  type: z.enum(['summary', 'index']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'recoverable']),
  attemptCount: z.number().int().nonnegative(),
  lastError: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudioFinalizationTaskListQuerySchema = PaginationQuerySchema.pick({
  limit: true,
  page: true,
});
export const StudioFinalizationTaskListResponseSchema = PaginatedResponseSchema(
  StudioFinalizationTaskSchema,
);

export type CreateStudioProject = z.infer<typeof CreateStudioProjectSchema>;
export type PreviewStudioProjectImport = z.infer<typeof PreviewStudioProjectImportSchema>;
export type StudioProjectImportPreview = z.infer<typeof StudioProjectImportPreviewSchema>;
export type StudioProjectImportFactCandidate = z.infer<
  typeof StudioProjectImportFactCandidateSchema
>;
export type ConfirmStudioProjectImport = z.infer<typeof ConfirmStudioProjectImportSchema>;
export type StudioProjectImportResult = z.infer<typeof StudioProjectImportResultSchema>;
export type CreateStudioAdaptation = z.infer<typeof CreateStudioAdaptationSchema>;
export type UpdateStudioAdaptationBrief = z.infer<typeof UpdateStudioAdaptationBriefSchema>;
export type StudioAdaptationProject = z.infer<typeof StudioAdaptationProjectSchema>;
export type StudioAdaptationListQuery = z.infer<typeof StudioAdaptationListQuerySchema>;
export type StudioAdaptationListResponse = z.infer<typeof StudioAdaptationListResponseSchema>;
export type StudioAdaptationSourceChapter = z.infer<typeof StudioAdaptationSourceChapterSchema>;
export type StudioAdaptationSourceChapterListQuery = z.infer<
  typeof StudioAdaptationSourceChapterListQuerySchema
>;
export type StudioAdaptationSourceChapterListResponse = z.infer<
  typeof StudioAdaptationSourceChapterListResponseSchema
>;
export type CreateStudioAdaptationDecision = z.infer<
  typeof CreateStudioAdaptationDecisionSchema
>;
export type ResolveStudioAdaptationDecision = z.infer<
  typeof ResolveStudioAdaptationDecisionSchema
>;
export type StudioAdaptationDecision = z.infer<typeof StudioAdaptationDecisionSchema>;
export type StudioAdaptationDecisionListQuery = z.infer<
  typeof StudioAdaptationDecisionListQuerySchema
>;
export type StudioAdaptationDecisionListResponse = z.infer<
  typeof StudioAdaptationDecisionListResponseSchema
>;
export type StudioScenePlanScene = z.infer<typeof StudioScenePlanSceneSchema>;
export type StudioScenePlanSceneOutline = z.infer<typeof StudioScenePlanSceneOutlineSchema>;
export type StudioScenePlan = z.infer<typeof StudioScenePlanSchema>;
export type SaveStudioScenePlan = z.infer<typeof SaveStudioScenePlanSchema>;
export type StudioScenePlanListQuery = z.infer<typeof StudioScenePlanListQuerySchema>;
export type StudioScenePlanListResponse = z.infer<typeof StudioScenePlanListResponseSchema>;
export type StudioSourceSceneMapping = z.infer<typeof StudioSourceSceneMappingSchema>;
export type CreateStudioSourceSceneMapping = z.infer<
  typeof CreateStudioSourceSceneMappingSchema
>;
export type ResolveStudioSourceSceneMapping = z.infer<
  typeof ResolveStudioSourceSceneMappingSchema
>;
export type StudioSourceSceneMappingListQuery = z.infer<
  typeof StudioSourceSceneMappingListQuerySchema
>;
export type StudioSourceSceneMappingListResponse = z.infer<
  typeof StudioSourceSceneMappingListResponseSchema
>;
export type StudioScreenplaySceneRevision = z.infer<
  typeof StudioScreenplaySceneRevisionSchema
>;
export type CreateStudioScreenplaySceneRevision = z.infer<
  typeof CreateStudioScreenplaySceneRevisionSchema
>;
export type StudioScreenplaySceneRevisionListQuery = z.infer<
  typeof StudioScreenplaySceneRevisionListQuerySchema
>;
export type StudioScreenplaySceneRevisionListResponse = z.infer<
  typeof StudioScreenplaySceneRevisionListResponseSchema
>;
export type StudioAdaptationExportQuery = z.infer<typeof StudioAdaptationExportQuerySchema>;
export type StudioAdaptationExport = z.infer<typeof StudioAdaptationExportSchema>;
export type StudioStandaloneScreenplayScene = z.infer<
  typeof StudioStandaloneScreenplaySceneSchema
>;
export type SaveStudioStandaloneScreenplayScene = z.infer<
  typeof SaveStudioStandaloneScreenplaySceneSchema
>;
export type StudioStandaloneScreenplaySceneListQuery = z.infer<
  typeof StudioStandaloneScreenplaySceneListQuerySchema
>;
export type StudioStandaloneScreenplaySceneListResponse = z.infer<
  typeof StudioStandaloneScreenplaySceneListResponseSchema
>;
export type StudioStandaloneScreenplayRevision = z.infer<
  typeof StudioStandaloneScreenplayRevisionSchema
>;
export type CreateStudioStandaloneScreenplayRevision = z.infer<
  typeof CreateStudioStandaloneScreenplayRevisionSchema
>;
export type StudioStandaloneScreenplayRevisionListQuery = z.infer<
  typeof StudioStandaloneScreenplayRevisionListQuerySchema
>;
export type StudioStandaloneScreenplayRevisionListResponse = z.infer<
  typeof StudioStandaloneScreenplayRevisionListResponseSchema
>;
export type StudioStandaloneScreenplayExportQuery = z.infer<
  typeof StudioStandaloneScreenplayExportQuerySchema
>;
export type StudioStandaloneScreenplayExport = z.infer<
  typeof StudioStandaloneScreenplayExportSchema
>;
export type StudioAdaptationSourceDrift = z.infer<typeof StudioAdaptationSourceDriftSchema>;
export type StudioAdaptationMarkStaleResponse = z.infer<
  typeof StudioAdaptationMarkStaleResponseSchema
>;
export type StudioFactProposal = z.infer<typeof StudioFactProposalSchema>;
export type GenerationJob = z.infer<typeof GenerationJobSchema>;
export type StudioBlueprint = z.infer<typeof StudioBlueprintSchema>;
export type StudioBlueprintListQuery = z.infer<typeof StudioBlueprintListQuerySchema>;
export type StudioBlueprintListResponse = z.infer<typeof StudioBlueprintListResponseSchema>;
export type UpdateStudioBlueprint = z.infer<typeof UpdateStudioBlueprintSchema>;
export type StudioChapterPlan = z.infer<typeof StudioChapterPlanSchema>;
export type ConsistencyReviewRequest = z.infer<typeof ConsistencyReviewRequestSchema>;
export type ConsistencyReviewResult = z.infer<typeof ConsistencyReviewResultSchema>;
export type ChapterEnrichRequest = z.infer<typeof ChapterEnrichRequestSchema>;
export type ChapterEnrichResult = z.infer<typeof ChapterEnrichResultSchema>;
export type ParsedChapter = z.infer<typeof ParsedChapterSchema>;
export type BlueprintParseRequest = z.infer<typeof BlueprintParseRequestSchema>;
export type BlueprintParseResult = z.infer<typeof BlueprintParseResultSchema>;
export type ChapterSummarizeRequest = z.infer<typeof ChapterSummarizeRequestSchema>;
export type ChapterSummarizeResult = z.infer<typeof ChapterSummarizeResultSchema>;
export type UpdateStudioChapterPlan = z.infer<typeof UpdateStudioChapterPlanSchema>;
export type CreateStudioChapterDraft = z.infer<typeof CreateStudioChapterDraftSchema>;
export type CreateStudioAuthorRevision = z.infer<typeof CreateStudioAuthorRevisionSchema>;
export type StudioChapterRevision = z.infer<typeof StudioChapterRevisionSchema>;
export type StudioChapterFinalization = z.infer<typeof StudioChapterFinalizationSchema>;
export type StudioChapterFinalizationListQuery = z.infer<
  typeof StudioChapterFinalizationListQuerySchema
>;
export type StudioChapterFinalizationListResponse = z.infer<
  typeof StudioChapterFinalizationListResponseSchema
>;
export type StudioChapterRevisionListQuery = z.infer<typeof StudioChapterRevisionListQuerySchema>;
export type StudioChapterRevisionListResponse = z.infer<
  typeof StudioChapterRevisionListResponseSchema
>;
export type StudioChapterRevisionDiff = z.infer<typeof StudioChapterRevisionDiffSchema>;
export type StudioBlueprintRestoreResult = z.infer<typeof StudioBlueprintRestoreResultSchema>;
export type StudioChapterFinalRestoreResult = z.infer<typeof StudioChapterFinalRestoreResultSchema>;
export type CreateStudioFactChange = z.infer<typeof CreateStudioFactChangeSchema>;
export type ResolveStudioFactChange = z.infer<typeof ResolveStudioFactChangeSchema>;
export type StudioFactChange = z.infer<typeof StudioFactChangeSchema>;
export type StudioFactChangeListQuery = z.infer<typeof StudioFactChangeListQuerySchema>;
export type StudioFactChangeListResponse = z.infer<typeof StudioFactChangeListResponseSchema>;
export type StudioFact = z.infer<typeof StudioFactSchema>;
export type StudioFactListQuery = z.infer<typeof StudioFactListQuerySchema>;
export type StudioFactListResponse = z.infer<typeof StudioFactListResponseSchema>;
export type StudioReviewFinding = z.infer<typeof StudioReviewFindingSchema>;
export type ResolveStudioReviewFinding = z.infer<typeof ResolveStudioReviewFindingSchema>;
export type StudioReviewFindingListQuery = z.infer<typeof StudioReviewFindingListQuerySchema>;
export type StudioReviewFindingListResponse = z.infer<typeof StudioReviewFindingListResponseSchema>;
export type StudioProjectListQuery = z.infer<typeof StudioProjectListQuerySchema>;
export type StudioProjectListResponse = z.infer<typeof StudioProjectListResponseSchema>;
export type StudioProjectExportQuery = z.infer<typeof StudioProjectExportQuerySchema>;
export type StudioProjectExport = z.infer<typeof StudioProjectExportSchema>;
export type StudioProjectOverview = z.infer<typeof StudioProjectOverviewSchema>;
export type StudioProjectEvent = z.infer<typeof StudioProjectEventSchema>;
export type StudioProjectEventListQuery = z.infer<typeof StudioProjectEventListQuerySchema>;
export type StudioProjectEventListResponse = z.infer<typeof StudioProjectEventListResponseSchema>;
export type StudioFinalizationTask = z.infer<typeof StudioFinalizationTaskSchema>;
export type StudioFinalizationTaskListQuery = z.infer<typeof StudioFinalizationTaskListQuerySchema>;
export type StudioFinalizationTaskListResponse = z.infer<
  typeof StudioFinalizationTaskListResponseSchema
>;
