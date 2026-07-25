import { HttpService } from '@nestjs/axios';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { z } from 'zod';
import {
  BlueprintParseRequestSchema,
  BlueprintParseResultSchema,
  ChapterEnrichRequestSchema,
  ChapterEnrichResultSchema,
  ChapterSummarizeRequestSchema,
  ChapterSummarizeResultSchema,
  ConsistencyReviewRequestSchema,
  ConsistencyReviewResultSchema,
  CreateStudioProjectSchema,
  GenerationJobSchema,
  StudioBlueprintSchema,
  StudioChapterPlanSchema,
  type BlueprintParseRequest,
  type BlueprintParseResult,
  type ChapterEnrichRequest,
  type ChapterEnrichResult,
  type ChapterSummarizeRequest,
  type ChapterSummarizeResult,
  type ConsistencyReviewRequest,
  type ConsistencyReviewResult,
  type CreateStudioChapterDraft,
  type CreateStudioProject,
  type GenerationJob,
} from '@repo/contracts';

const InternalCreateJobSchema = z.object({
  ownerId: z.string().uuid(),
  jobId: z.string().uuid(),
  project: CreateStudioProjectSchema.extend({ id: z.string().uuid() }),
});

const InternalCreateChapterDraftJobSchema = InternalCreateJobSchema.extend({
  kind: z.literal('chapter_draft'),
  blueprint: StudioBlueprintSchema,
  chapterPlan: StudioChapterPlanSchema,
  prompt: z.string().max(2_000),
});

const InternalFinalizationTaskSchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  revisionId: z.string().uuid(),
  chapterNumber: z.number().int().positive(),
  type: z.enum(['summary', 'index']),
  content: z.string().min(1).max(200_000),
});

const InternalFinalizationTaskResultSchema = z.object({
  type: z.enum(['summary', 'index']),
  revisionId: z.string().uuid(),
  chapterNumber: z.number().int().positive(),
  summary: z.string().optional(),
  contentChecksum: z.string().length(64).optional(),
  characterCount: z.number().int().nonnegative().optional(),
});

const InternalHardFactReviewSchema = z.object({
  content: z.string().min(1).max(200_000),
  facts: z.array(z.object({
    id: z.string().uuid(),
    subject: z.string().min(1),
    predicate: z.string().min(1),
    value: z.string().min(1),
  })),
});

const InternalHardFactReviewFindingSchema = z.object({
  factId: z.string().uuid(),
  ruleId: z.literal('hard-fact-negation'),
  evidenceStart: z.number().int().nonnegative(),
  evidenceEnd: z.number().int().nonnegative(),
  evidence: z.string(),
  suggestedAction: z.string(),
});

@Injectable()
export class NovelRuntimeClient {
  private readonly baseUrl: string;
  private readonly sharedSecret: string;
  private readonly defaultTimeoutMs: number;
  private readonly llmTimeoutMs: number;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.baseUrl = this.config.get<string>('NOVEL_RUNTIME_BASE_URL') ?? 'http://127.0.0.1:18080';
    this.sharedSecret = this.config.get<string>('NOVEL_RUNTIME_SHARED_SECRET') ?? '';
    // Sync LLM endpoints (enrich / summarize / consistency) can take tens of seconds;
    // job / parse / hard-fact calls stay fast. Both are tunable via config.
    this.defaultTimeoutMs = this.config.get<number>('NOVEL_RUNTIME_TIMEOUT_MS') ?? 15_000;
    this.llmTimeoutMs = this.config.get<number>('NOVEL_RUNTIME_LLM_TIMEOUT_MS') ?? 120_000;
  }

  async createJob(
    ownerId: string,
    projectId: string,
    jobId: string,
    project: CreateStudioProject,
  ): Promise<GenerationJob> {
    const body = InternalCreateJobSchema.parse({
      ownerId,
      jobId,
      project: { ...project, id: projectId },
    });
    return this.request('post', '/v1/generation-jobs', body, GenerationJobSchema);
  }

  async getJob(ownerId: string, jobId: string): Promise<GenerationJob> {
    return this.request(
      'get',
      `/v1/generation-jobs/${jobId}`,
      undefined,
      GenerationJobSchema,
      { owner_id: ownerId },
    );
  }

  async retryJob(ownerId: string, jobId: string): Promise<GenerationJob> {
    return this.request(
      'post',
      `/v1/generation-jobs/${jobId}/retry`,
      undefined,
      GenerationJobSchema,
      { owner_id: ownerId },
    );
  }

  async cancelJob(ownerId: string, jobId: string): Promise<GenerationJob> {
    return this.request(
      'post',
      `/v1/generation-jobs/${jobId}/cancel`,
      undefined,
      GenerationJobSchema,
      { owner_id: ownerId },
    );
  }

  async executeFinalizationTask(input: z.input<typeof InternalFinalizationTaskSchema>) {
    const body = InternalFinalizationTaskSchema.parse(input);
    return this.request('post', '/v1/finalization-tasks', body, InternalFinalizationTaskResultSchema);
  }

  async reviewHardFacts(input: z.input<typeof InternalHardFactReviewSchema>) {
    const body = InternalHardFactReviewSchema.parse(input);
    return this.request(
      'post',
      '/v1/reviews/hard-facts',
      body,
      z.array(InternalHardFactReviewFindingSchema),
    );
  }

  async reviewConsistency(input: ConsistencyReviewRequest): Promise<ConsistencyReviewResult> {
    const body = ConsistencyReviewRequestSchema.parse(input);
    return this.request('post', '/v1/reviews/consistency', body, ConsistencyReviewResultSchema, undefined, this.llmTimeoutMs);
  }

  async enrichChapter(input: ChapterEnrichRequest): Promise<ChapterEnrichResult> {
    const body = ChapterEnrichRequestSchema.parse(input);
    return this.request('post', '/v1/chapters/enrich', body, ChapterEnrichResultSchema, undefined, this.llmTimeoutMs);
  }

  async parseBlueprint(input: BlueprintParseRequest): Promise<BlueprintParseResult> {
    const body = BlueprintParseRequestSchema.parse(input);
    return this.request('post', '/v1/chapters/parse-blueprint', body, BlueprintParseResultSchema);
  }

  async summarizeRecentChapters(input: ChapterSummarizeRequest): Promise<ChapterSummarizeResult> {
    const body = ChapterSummarizeRequestSchema.parse(input);
    return this.request('post', '/v1/chapters/summarize-recent', body, ChapterSummarizeResultSchema, undefined, this.llmTimeoutMs);
  }

  async createChapterDraftJob(
    ownerId: string,
    projectId: string,
    jobId: string,
    project: CreateStudioProject,
    blueprint: z.infer<typeof StudioBlueprintSchema>,
    chapterPlan: z.infer<typeof StudioChapterPlanSchema>,
    input: CreateStudioChapterDraft,
  ): Promise<GenerationJob> {
    const body = InternalCreateChapterDraftJobSchema.parse({
      ownerId,
      jobId,
      project: { ...project, id: projectId },
      kind: 'chapter_draft',
      blueprint,
      chapterPlan,
      prompt: input.prompt,
    });
    return this.request('post', '/v1/generation-jobs', body, GenerationJobSchema);
  }

  private async request<T>(
    method: 'get' | 'post',
    path: string,
    data: unknown,
    schema: z.ZodType<T>,
    params?: Record<string, string>,
    timeoutMs: number = this.defaultTimeoutMs,
  ): Promise<T> {
    if (!this.sharedSecret) {
      throw new Error('NOVEL_RUNTIME_SHARED_SECRET is not configured');
    }

    try {
      const response = await this.http.axiosRef.request({
        method,
        url: `${this.baseUrl}${path}`,
        data,
        params,
        timeout: timeoutMs,
        headers: { 'x-runtime-secret': this.sharedSecret },
      });
      return schema.parse(response.data);
    } catch (error) {
      this.logger.error('Novel runtime request failed', {
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Novel runtime is unavailable', { cause: error });
    }
  }
}
