import {
  CreateStudioAuthorRevisionSchema,
  CreateStudioProjectSchema,
  CreateStudioAdaptationSchema,
  CreateStudioAdaptationDecisionSchema,
  ResolveStudioAdaptationDecisionSchema,
  UpdateStudioAdaptationBriefSchema,
  StudioAdaptationSourceChapterListResponseSchema,
  GenerationJobSchema,
  ResolveStudioReviewFindingSchema,
  StudioProjectExportQuerySchema,
} from '../schemas/studio.schema';

describe('studio schemas', () => {
  it('applies generation defaults at the API boundary', () => {
    expect(
      CreateStudioProjectSchema.parse({
        title: '雾港来信',
        genre: '悬疑',
        premise: '一名失踪多年的记者寄回一封信，迫使女儿回到封锁的港口查明真相。',
      }),
    ).toMatchObject({
      format: 'novel',
      chapterCount: 20,
      targetWordsPerChapter: 3000,
      generateOutline: true,
    });
    expect(
      CreateStudioProjectSchema.safeParse({
        title: '雾港来信',
        format: 'screenplay',
        genre: '悬疑',
        premise: '一名失踪多年的记者寄回一封信，迫使女儿回到封锁的港口查明真相。',
      }).success,
    ).toBe(false);
  });

  it('accepts a completed runtime job returned through NestJS', () => {
    expect(
      GenerationJobSchema.parse({
        id: '585f7dda-1a1a-4d6d-a4cd-2e10f6c2a720',
        project: {
          id: '9323d31e-4968-4ed1-a90c-326ec5c764a1',
          title: '雾港来信',
          format: 'novel',
          genre: '悬疑',
          chapterCount: 20,
          targetWordsPerChapter: 3000,
        },
        status: 'succeeded',
        progress: 100,
        currentStep: 'Generation complete',
        artifact: { architecture: '架构内容' },
        createdAt: '2026-07-24T10:00:00.000Z',
        updatedAt: '2026-07-24T10:01:00.000Z',
      }).status,
    ).toBe('succeeded');
  });

  it('requires explicit source-right confirmation before starting an adaptation', () => {
    expect(
      CreateStudioAdaptationSchema.safeParse({
        targetFormat: 'short_drama',
        episodeCount: 60,
        minutesPerEpisode: 2,
      }).success,
    ).toBe(false);
    expect(
      CreateStudioAdaptationSchema.parse({
        targetFormat: 'short_drama',
        episodeCount: 60,
        minutesPerEpisode: 2,
        rightsConfirmed: true,
      }),
    ).toMatchObject({ targetFormat: 'short_drama', rightsConfirmed: true });
  });

  it('keeps brief edits bounded while allowing an author to complete them before confirmation', () => {
    expect(
      UpdateStudioAdaptationBriefSchema.safeParse({
        targetFormat: 'series',
        episodeCount: 12,
        minutesPerEpisode: 45,
        targetAudience: '悬疑剧观众',
        adaptationGoal: '保留原作悬疑主线，同时强化角色冲突。',
        mustPreserve: '保留主角动机。',
      }).success,
    ).toBe(true);
    expect(
      UpdateStudioAdaptationBriefSchema.safeParse({
        targetFormat: 'series',
        episodeCount: 101,
        minutesPerEpisode: 45,
        targetAudience: '',
        adaptationGoal: '',
        mustPreserve: '',
      }).success,
    ).toBe(false);
  });

  it('requires a source chapter, rationale, and explicit outcome for adaptation decisions', () => {
    expect(
      CreateStudioAdaptationDecisionSchema.safeParse({
        sourceChapterId: 'd5a58dc8-0dea-4766-a7f7-9c384ee8d9f2',
        type: 'cut',
        impact: 'high',
        proposal: '删去重复交代港口历史的段落。',
        rationale: '让有限时长留给人物关系和案件推进。',
      }).success,
    ).toBe(true);
    expect(
      CreateStudioAdaptationDecisionSchema.safeParse({
        sourceChapterId: 'not-a-uuid',
        type: 'cut',
        impact: 'high',
        proposal: '删去重复交代港口历史的段落。',
        rationale: '',
      }).success,
    ).toBe(false);
    expect(
      ResolveStudioAdaptationDecisionSchema.safeParse({
        outcome: 'accepted',
        resolutionReason: '',
      }).success,
    ).toBe(false);
  });

  it('paginates immutable source chapters captured for an adaptation', () => {
    const chapter = {
      id: 'c2fe573d-e9e0-423e-9319-4f6fc375e75d',
      snapshotId: '723b82cf-cfa4-4ddc-b11a-bc89f42f73a7',
      sourceRevisionId: '8a1f5e2c-7b3a-4d9e-b6c1-2f4a8d9e0b3a',
      chapterNumber: 1,
      title: '迟到的信件',
      content: '雨声先于信件抵达。',
      contentHash: 'a'.repeat(64),
      wordCount: 8,
      createdAt: '2026-07-24T02:00:00.000Z',
    };
    expect(
      StudioAdaptationSourceChapterListResponseSchema.safeParse({
        list: [chapter],
        total: 1,
        page: 1,
        limit: 20,
      }).success,
    ).toBe(true);
    expect(
      StudioAdaptationSourceChapterListResponseSchema.safeParse({
        list: [{ ...chapter, chapterNumber: 0 }],
        total: 1,
        page: 1,
        limit: 20,
      }).success,
    ).toBe(false);
  });

  it('preserves author revision content while rejecting whitespace-only text', () => {
    expect(
      CreateStudioAuthorRevisionSchema.parse({
        content: '  雨声先于信件抵达。\n',
        editSummary: '补充开场氛围。',
      }),
    ).toEqual({
      content: '  雨声先于信件抵达。\n',
      editSummary: '补充开场氛围。',
    });
    expect(CreateStudioAuthorRevisionSchema.safeParse({ content: ' \n ' }).success).toBe(false);
  });

  it('parses only explicit export force values from HTTP query strings', () => {
    expect(StudioProjectExportQuerySchema.parse({ force: 'false' }).force).toBe(false);
    expect(StudioProjectExportQuerySchema.parse({ force: 'true' }).force).toBe(true);
    expect(StudioProjectExportQuerySchema.safeParse({ force: '1' }).success).toBe(false);
  });

  it('requires a replacement fact value for intentional hard-fact changes', () => {
    expect(
      ResolveStudioReviewFindingSchema.safeParse({
        decision: 'intentional_change',
        reason: '角色职业在本章发生变化。',
      }).success,
    ).toBe(false);
    expect(
      ResolveStudioReviewFindingSchema.safeParse({
        decision: 'intentional_change',
        reason: '角色职业在本章发生变化。',
        resolvedValue: '记者',
      }).success,
    ).toBe(true);
  });
});
