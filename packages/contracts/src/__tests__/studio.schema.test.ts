import {
  CreateStudioAuthorRevisionSchema,
  CreateStudioProjectSchema,
  GenerationJobSchema,
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
});
