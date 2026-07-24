import { HttpService } from '@nestjs/axios';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { z } from 'zod';
import {
  CreateStudioProjectSchema,
  GenerationJobSchema,
  StudioBlueprintSchema,
  StudioChapterPlanSchema,
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

@Injectable()
export class NovelRuntimeClient {
  private readonly baseUrl: string;
  private readonly sharedSecret: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.baseUrl = this.config.get<string>('NOVEL_RUNTIME_BASE_URL') ?? 'http://127.0.0.1:18080';
    this.sharedSecret = this.config.get<string>('NOVEL_RUNTIME_SHARED_SECRET') ?? '';
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
        timeout: 15_000,
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
