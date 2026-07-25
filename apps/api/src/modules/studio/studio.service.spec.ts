import { StudioService } from './studio.service';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const ownerId = '0e3a7e4b-9bb5-4c8e-a1a3-7b6b0861c5ad';
const projectId = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1';
const runId = 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a';
const adaptationId = '9411db03-f65f-4829-aae5-82175bdc25b4';
const snapshotId = '723b82cf-cfa4-4ddc-b11a-bc89f42f73a7';
const sourceChapterId = 'c2fe573d-e9e0-423e-9319-4f6fc375e75d';
const decisionId = '44bc6378-7f2d-43a8-8ee3-9ed5d72c19d8';
const revisionId = '06c1a8d0-df48-41de-bb05-9e3219a31352';
const createdAt = new Date('2026-07-24T02:00:00.000Z');

const projectInput = {
  title: '雾港来信',
  format: 'novel' as const,
  genre: '悬疑',
  premise: '一封迟到二十年的信件，让雾港的失踪案重新浮出水面。',
  chapterCount: 20,
  targetWordsPerChapter: 3000,
  guidance: '保持冷峻克制的叙述。',
  generateOutline: true,
};

describe('StudioService', () => {
  const runtimeClient = {
    createJob: jest.fn(),
    createChapterDraftJob: jest.fn(),
    getJob: jest.fn(),
    retryJob: jest.fn(),
    cancelJob: jest.fn(),
    reviewHardFacts: jest.fn(),
  };
  const projectService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const runService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
  const projectImportService = {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  };
  const projectEventService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
  };
  const adaptationProjectService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
  const adaptationSourceSnapshotService = {
    create: jest.fn(),
    get: jest.fn(),
    getById: jest.fn(),
  };
  const adaptationSourceChapterService = {
    createMany: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
  };
  const adaptationDecisionService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const scenePlanService = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const sourceSceneMappingService = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const screenplayRevisionService = {
    list: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  };
  const standaloneScreenplaySceneService = {
    list: jest.fn(),
    get: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const standaloneScreenplayRevisionService = {
    list: jest.fn(),
    create: jest.fn(),
  };
  const blueprintService = {
    create: jest.fn(),
    get: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
  const chapterPlanService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const chapterRevisionService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
  const chapterDraftPointerService = {
    get: jest.fn(),
    upsert: jest.fn(),
  };
  const chapterFinalPointerService = {
    count: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    upsert: jest.fn(),
  };
  const chapterFinalizationService = {
    create: jest.fn(),
    getByRevisionId: jest.fn(),
    update: jest.fn(),
  };
  const finalizationOutboxTaskService = {
    create: jest.fn(),
    count: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  };
  const finalizationFactSnapshotService = {
    createMany: jest.fn(),
    list: jest.fn(),
  };
  const factService = {
    count: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const reviewFindingService = {
    count: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    getByFindingKey: jest.fn(),
    update: jest.fn(),
  };
  const factChangeService = {
    count: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
  const reviewAnnotationService = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const auditLogService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logExport: jest.fn(),
  };

  let service: StudioService;

  beforeEach(() => {
    jest.resetAllMocks();
    blueprintService.get.mockResolvedValue(null);
    blueprintService.list.mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      limit: 1,
    });
    factChangeService.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 500 });
    factService.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 500 });
    runtimeClient.reviewHardFacts.mockResolvedValue([]);
    reviewFindingService.count.mockResolvedValue(0);
    service = new StudioService(
      runtimeClient as never,
      projectService as never,
      projectImportService as never,
      projectEventService as never,
      adaptationProjectService as never,
      adaptationSourceSnapshotService as never,
      adaptationSourceChapterService as never,
      adaptationDecisionService as never,
      scenePlanService as never,
      sourceSceneMappingService as never,
      screenplayRevisionService as never,
      standaloneScreenplaySceneService as never,
      standaloneScreenplayRevisionService as never,
      runService as never,
      blueprintService as never,
      chapterPlanService as never,
      chapterRevisionService as never,
      chapterDraftPointerService as never,
      chapterFinalPointerService as never,
      chapterFinalizationService as never,
      finalizationOutboxTaskService as never,
      finalizationFactSnapshotService as never,
      factService as never,
      reviewFindingService as never,
      factChangeService as never,
      reviewAnnotationService as never,
      { execute: async <T>(callback: () => Promise<T>) => callback() } as never,
      auditLogService as never,
      { warn: jest.fn() } as never,
    );
  });

  it('persists a project and queued run before dispatching the same run id to Python', async () => {
    projectService.create.mockResolvedValue({
      id: projectId,
      ownerId,
      ...projectInput,
    });
    runService.create.mockResolvedValue({ id: runId });
    runService.update.mockResolvedValue({
      id: runId,
      projectId,
      status: 'QUEUED',
      progress: 0,
      currentStep: 'Queued for generation',
      architecture: null,
      outline: null,
      error: null,
      createdAt,
      updatedAt: createdAt,
    });
    runtimeClient.createJob.mockResolvedValue({
      id: runId,
      project: { id: projectId, ...projectInput },
      status: 'queued',
      progress: 0,
      currentStep: 'Queued for generation',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });

    await service.createProject(ownerId, projectInput);

    expect(projectService.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId, ...projectInput }),
    );
    expect(runService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        project: { connect: { id: projectId } },
        status: 'QUEUED',
        progress: 0,
      }),
    );
    expect(runtimeClient.createJob).toHaveBeenCalledWith(
      ownerId,
      projectId,
      expect.any(String),
      projectInput,
    );
    expect(runtimeClient.createJob.mock.calls[0][2]).toBe(runService.create.mock.calls[0][0].id);
    expect(auditLogService.logCreate).toHaveBeenCalledWith(
      'studio.project',
      projectId,
      ownerId,
      expect.objectContaining({
        runId: runService.create.mock.calls[0][0].id,
        title: projectInput.title,
      }),
    );
  });

  it("creates an adaptation only from the author's finalized novel snapshot", async () => {
    const sourceProject = { id: projectId, ownerId, ...projectInput, updatedAt: createdAt };
    const adaptation = {
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '强化人物冲突。',
      mustPreserve: '保留雾港的秘密。',
      rightsConfirmedAt: createdAt,
      status: 'BRIEF_DRAFT',
      createdAt,
      updatedAt: createdAt,
    };
    const snapshot = {
      id: snapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: projectInput.title,
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 1,
      createdAt,
    };
    projectService.getById.mockResolvedValue(sourceProject);
    chapterFinalPointerService.list.mockResolvedValue({
      list: [{ projectId, chapterNumber: 1, revisionId }],
      total: 1,
      page: 1,
      limit: 20,
    });
    chapterRevisionService.getById.mockResolvedValue({
      id: revisionId,
      projectId,
      chapterPlanId: '5073d890-50f4-4a42-8df1-17c1441cc26b',
      chapterNumber: 1,
      status: 'FINALIZED',
      content: '雨声先于信件抵达。',
      contentHash: 'a'.repeat(64),
      wordCount: 10,
    });
    chapterPlanService.getById.mockResolvedValue({
      id: '5073d890-50f4-4a42-8df1-17c1441cc26b',
      projectId,
      chapterNumber: 1,
      title: '迟到的信件',
    });
    adaptationProjectService.create.mockResolvedValue(adaptation);
    adaptationProjectService.update.mockResolvedValue(adaptation);
    adaptationSourceSnapshotService.create.mockResolvedValue(snapshot);

    const result = await service.createAdaptation(ownerId, projectId, {
      targetFormat: 'series',
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '强化人物冲突。',
      mustPreserve: '保留雾港的秘密。',
      rightsConfirmed: true,
    });

    expect(chapterFinalPointerService.list).toHaveBeenCalledWith(
      { projectId },
      expect.objectContaining({ orderBy: { chapterNumber: 'asc' } }),
    );
    expect(adaptationProjectService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId,
        sourceProject: { connect: { id: projectId } },
        targetFormat: 'SERIES',
        status: 'BRIEF_DRAFT',
      }),
    );
    expect(adaptationSourceChapterService.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        snapshotId,
        sourceRevisionId: revisionId,
        title: '迟到的信件',
        content: '雨声先于信件抵达。',
      }),
    ]);
    expect(result).toMatchObject({
      id: adaptationId,
      status: 'brief_draft',
      sourceSnapshot: { id: snapshotId, sourceChapterCount: 1 },
    });
  });

  it('saves a draft adaptation brief without changing its immutable source snapshot', async () => {
    const adaptation = {
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '',
      adaptationGoal: '',
      mustPreserve: '',
      status: 'BRIEF_DRAFT',
      createdAt,
      updatedAt: createdAt,
    };
    const snapshot = {
      id: snapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: projectInput.title,
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 1,
      createdAt,
    };
    const updated = {
      ...adaptation,
      targetFormat: 'SHORT_DRAMA',
      episodeCount: 60,
      minutesPerEpisode: 2,
      targetAudience: '短剧用户',
      adaptationGoal: '将主线事件压缩为强节奏的短剧冲突。',
      mustPreserve: '保留主角追查失踪案的动机。',
    };
    adaptationProjectService.getById.mockResolvedValue(adaptation);
    adaptationProjectService.update.mockResolvedValue(updated);
    adaptationSourceSnapshotService.getById.mockResolvedValue(snapshot);

    const result = await service.updateAdaptationBrief(ownerId, adaptationId, {
      targetFormat: 'short_drama',
      episodeCount: 60,
      minutesPerEpisode: 2,
      targetAudience: '短剧用户',
      adaptationGoal: '将主线事件压缩为强节奏的短剧冲突。',
      mustPreserve: '保留主角追查失踪案的动机。',
    });

    expect(adaptationProjectService.update).toHaveBeenCalledWith(
      { id: adaptationId },
      expect.objectContaining({ targetFormat: 'SHORT_DRAMA', episodeCount: 60 }),
    );
    expect(adaptationSourceSnapshotService.getById).toHaveBeenCalledWith(snapshotId);
    expect(result).toMatchObject({
      targetFormat: 'short_drama',
      status: 'brief_draft',
      sourceSnapshot: { id: snapshotId },
    });
  });

  it('confirms only a complete adaptation brief before blueprint review', async () => {
    const incomplete = {
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetAudience: '',
      adaptationGoal: '',
      mustPreserve: '',
      status: 'BRIEF_DRAFT',
    };
    adaptationProjectService.getById.mockResolvedValueOnce(incomplete);
    await expect(service.confirmAdaptationBrief(ownerId, adaptationId)).rejects.toMatchObject({});
    expect(adaptationProjectService.update).not.toHaveBeenCalled();

    const complete = {
      ...incomplete,
      targetFormat: 'SERIES',
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线，同时强化女主与父亲的冲突。',
      mustPreserve: '保留雾港秘密与终局反转。',
      createdAt,
      updatedAt: createdAt,
    };
    const snapshot = {
      id: snapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: projectInput.title,
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 1,
      createdAt,
    };
    adaptationProjectService.getById.mockResolvedValueOnce(complete);
    adaptationProjectService.update.mockResolvedValue({ ...complete, status: 'BLUEPRINT_REVIEW' });
    adaptationSourceSnapshotService.getById.mockResolvedValue(snapshot);

    const result = await service.confirmAdaptationBrief(ownerId, adaptationId);

    expect(adaptationProjectService.update).toHaveBeenCalledWith(
      { id: adaptationId },
      { status: 'BLUEPRINT_REVIEW' },
    );
    expect(result.status).toBe('blueprint_review');
    expect(projectEventService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADAPTATION_STATUS',
        payload: { adaptationId, status: 'blueprint_review' },
      }),
    );
  });

  it('records a source-anchored decision only during adaptation blueprint review', async () => {
    const adaptation = {
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      status: 'BLUEPRINT_REVIEW',
    };
    const snapshot = { id: snapshotId, adaptationId };
    const sourceChapter = {
      id: sourceChapterId,
      snapshotId,
      chapterNumber: 1,
      title: '迟到的信件',
    };
    const decision = {
      id: decisionId,
      adaptationId,
      snapshotId,
      sourceChapterId,
      type: 'CUT',
      impact: 'HIGH',
      proposal: '删去重复交代港口历史的段落。',
      rationale: '将有限时长留给人物关系和案件推进。',
      status: 'PROPOSED',
      resolutionReason: null,
      resolvedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    adaptationProjectService.getById.mockResolvedValue(adaptation);
    adaptationSourceSnapshotService.getById.mockResolvedValue(snapshot);
    adaptationSourceChapterService.getById.mockResolvedValue(sourceChapter);
    adaptationDecisionService.create.mockResolvedValue(decision);

    const result = await service.createAdaptationDecision(ownerId, adaptationId, {
      sourceChapterId,
      type: 'cut',
      impact: 'high',
      proposal: decision.proposal,
      rationale: decision.rationale,
    });

    expect(adaptationDecisionService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CUT',
        impact: 'HIGH',
        sourceChapter: { connect: { id: sourceChapterId } },
        snapshot: { connect: { id: snapshotId } },
      }),
    );
    expect(result).toMatchObject({
      type: 'cut',
      impact: 'high',
      status: 'proposed',
      sourceChapter: { id: sourceChapterId, title: '迟到的信件' },
    });
  });

  it('rejects a decision anchor outside the immutable adaptation snapshot', async () => {
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      status: 'BLUEPRINT_REVIEW',
    });
    adaptationSourceSnapshotService.getById.mockResolvedValue({ id: snapshotId, adaptationId });
    adaptationSourceChapterService.getById.mockResolvedValue({
      id: sourceChapterId,
      snapshotId: 'dcfc2f2a-e318-4bca-b0e3-9898b111197d',
    });

    await expect(
      service.createAdaptationDecision(ownerId, adaptationId, {
        sourceChapterId,
        type: 'merge',
        impact: 'medium',
        proposal: '合并两个介绍同一线索的段落。',
        rationale: '减少重复信息。',
      }),
    ).rejects.toMatchObject({});
    expect(adaptationDecisionService.create).not.toHaveBeenCalled();
  });

  it('resolves a proposed adaptation decision once and preserves its source anchor', async () => {
    const sourceChapter = {
      id: sourceChapterId,
      snapshotId,
      chapterNumber: 1,
      title: '迟到的信件',
    };
    const proposed = {
      id: decisionId,
      adaptationId,
      snapshotId,
      sourceChapterId,
      type: 'MERGE',
      impact: 'MEDIUM',
      proposal: '合并两段线索介绍。',
      rationale: '提升节奏。',
      status: 'PROPOSED',
      resolutionReason: null,
      resolvedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    const resolvedAt = new Date('2026-07-25T08:00:00.000Z');
    adaptationProjectService.getById.mockResolvedValue({ id: adaptationId, currentSnapshotId: snapshotId, ownerId });
    adaptationDecisionService.getById.mockResolvedValue(proposed);
    adaptationSourceChapterService.getById.mockResolvedValue(sourceChapter);
    adaptationDecisionService.update.mockResolvedValue({
      ...proposed,
      status: 'ACCEPTED',
      resolutionReason: '保留合并后的关键情绪转折。',
      resolvedAt,
      updatedAt: resolvedAt,
    });

    const result = await service.resolveAdaptationDecision(ownerId, adaptationId, decisionId, {
      outcome: 'accepted',
      resolutionReason: '保留合并后的关键情绪转折。',
    });

    expect(adaptationDecisionService.update).toHaveBeenCalledWith(
      { id: decisionId },
      expect.objectContaining({ status: 'ACCEPTED', resolutionReason: '保留合并后的关键情绪转折。' }),
    );
    expect(result).toMatchObject({
      status: 'accepted',
      sourceChapter: { id: sourceChapterId },
      resolutionReason: '保留合并后的关键情绪转折。',
    });
  });

  it('lists the immutable source chapters captured for an owned adaptation', async () => {
    const chapters = [
      {
        id: sourceChapterId,
        snapshotId,
        sourceRevisionId: '8a1f5e2c-7b3a-4d9e-b6c1-2f4a8d9e0b3a',
        chapterNumber: 1,
        title: '迟到的信件',
        content: '雨声先于信件抵达。',
        contentHash: 'a'.repeat(64),
        wordCount: 8,
        createdAt,
      },
      {
        id: '3b9d6f1a-2c4e-4a7b-9d8e-1f2a3b4c5d6e',
        snapshotId,
        sourceRevisionId: '9b2f6e3d-8c4b-4a0e-c7d2-3a5b9e0f1c4b',
        chapterNumber: 2,
        title: '码头的重逢',
        content: '码头灯影摇晃。',
        contentHash: 'b'.repeat(64),
        wordCount: 7,
        createdAt,
      },
    ];
    adaptationProjectService.getById.mockResolvedValue({ id: adaptationId, currentSnapshotId: snapshotId, ownerId });
    adaptationSourceSnapshotService.getById.mockResolvedValue({ id: snapshotId, adaptationId });
    adaptationSourceChapterService.list.mockResolvedValue({
      list: chapters,
      total: 2,
      page: 1,
      limit: 20,
    });

    const result = await service.listAdaptationSourceChapters(ownerId, adaptationId, {
      page: 1,
      limit: 20,
    });

    expect(adaptationSourceChapterService.list).toHaveBeenCalledWith(
      { snapshotId },
      { page: 1, limit: 20, orderBy: { chapterNumber: 'asc' } },
    );
    expect(result.list).toEqual([
      expect.objectContaining({ chapterNumber: 1, title: '迟到的信件', snapshotId }),
      expect.objectContaining({ chapterNumber: 2, title: '码头的重逢', snapshotId }),
    ]);
  });

  it('blocks scene planning while a high-impact decision is unresolved', async () => {
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      status: 'BLUEPRINT_REVIEW',
    });
    adaptationDecisionService.count.mockResolvedValue(1);

    await expect(service.startScenePlanning(ownerId, adaptationId)).rejects.toMatchObject({});
    expect(adaptationProjectService.update).not.toHaveBeenCalled();
    expect(adaptationDecisionService.count).toHaveBeenCalledWith({
      adaptationId,
      impact: 'HIGH',
      status: 'PROPOSED',
    });
  });

  it('advances to scene planning once every high-impact decision is resolved', async () => {
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      status: 'BLUEPRINT_REVIEW',
    });
    adaptationSourceSnapshotService.getById.mockResolvedValue({
      id: snapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: '雾港来信',
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 2,
      createdAt,
    });
    adaptationDecisionService.count.mockResolvedValue(0);
    adaptationProjectService.update.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线。',
      mustPreserve: '保留雾港秘密。',
      rightsConfirmedAt: createdAt,
      status: 'SCENE_PLANNING',
      createdAt,
      updatedAt: createdAt,
    });

    const result = await service.startScenePlanning(ownerId, adaptationId);

    expect(adaptationProjectService.update).toHaveBeenCalledWith(
      { id: adaptationId },
      { status: 'SCENE_PLANNING' },
    );
    expect(result.status).toBe('scene_planning');
  });

  it('creates and reopens a per-episode scene plan during scene planning', async () => {
    const sceneOutline = [
      {
        sceneNumber: 1,
        title: '码头重逢',
        synopsis: '女主回到雾港码头。',
        act: 'setup',
        sourceChapterIds: [sourceChapterId],
      },
    ];
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      status: 'SCENE_PLANNING',
    });
    adaptationSourceSnapshotService.getById.mockResolvedValue({ id: snapshotId, adaptationId });
    scenePlanService.get.mockResolvedValue(null);
    scenePlanService.create.mockResolvedValue({
      id: '6a4c2e8d-9b1f-4c3a-8d2e-1b5f6a7c8d9e',
      adaptationId,
      episodeNumber: 1,
      title: '第 1 集',
      synopsis: '女主回到雾港。',
      sceneOutline,
      needsReview: false,
      confirmedAt: null,
      createdAt,
      updatedAt: createdAt,
    });

    const created = await service.saveScenePlan(ownerId, adaptationId, 1, {
      title: '第 1 集',
      synopsis: '女主回到雾港。',
      sceneOutline,
    });

    expect(scenePlanService.create).toHaveBeenCalledWith(
      expect.objectContaining({ episodeNumber: 1, adaptation: { connect: { id: adaptationId } } }),
    );
    expect(created.sceneOutline).toEqual(sceneOutline);

    const confirmedPlan = {
      id: '6a4c2e8d-9b1f-4c3a-8d2e-1b5f6a7c8d9e',
      adaptationId,
      episodeNumber: 1,
      title: '第 1 集',
      synopsis: '女主回到雾港。',
      sceneOutline,
      needsReview: false,
      confirmedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    };
    scenePlanService.get.mockResolvedValue({ ...confirmedPlan, confirmedAt: null });
    scenePlanService.update.mockResolvedValue(confirmedPlan);
    const confirmed = await service.confirmScenePlan(ownerId, adaptationId, 1);
    expect(confirmed.confirmedAt).toBe(createdAt.toISOString());
  });

  it('blocks script writing without a confirmed scene plan and advances once one exists', async () => {
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      status: 'SCENE_PLANNING',
    });
    adaptationSourceSnapshotService.getById.mockResolvedValue({
      id: snapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: '雾港来信',
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 2,
      createdAt,
    });
    scenePlanService.count.mockResolvedValue(0);

    await expect(service.startScriptWriting(ownerId, adaptationId)).rejects.toMatchObject({});
    expect(adaptationProjectService.update).not.toHaveBeenCalled();
    expect(scenePlanService.count).toHaveBeenCalledWith({
      adaptationId,
      confirmedAt: { not: null },
    });

    scenePlanService.count.mockResolvedValue(1);
    adaptationProjectService.update.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线。',
      mustPreserve: '保留雾港秘密。',
      rightsConfirmedAt: createdAt,
      status: 'SCRIPT_WRITING',
      createdAt,
      updatedAt: createdAt,
    });

    const result = await service.startScriptWriting(ownerId, adaptationId);

    expect(adaptationProjectService.update).toHaveBeenCalledWith(
      { id: adaptationId },
      { status: 'SCRIPT_WRITING' },
    );
    expect(result.status).toBe('script_writing');
  });

  it('advances to review ready only after a screenplay exists, then to deliverable', async () => {
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      status: 'SCRIPT_WRITING',
    });
    adaptationSourceSnapshotService.getById.mockResolvedValue({
      id: snapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: '雾港来信',
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 2,
      createdAt,
    });
    screenplayRevisionService.count.mockResolvedValue(0);

    await expect(service.startReviewReady(ownerId, adaptationId)).rejects.toMatchObject({});
    expect(adaptationProjectService.update).not.toHaveBeenCalled();

    screenplayRevisionService.count.mockResolvedValue(1);
    adaptationProjectService.update.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线。',
      mustPreserve: '保留雾港秘密。',
      rightsConfirmedAt: createdAt,
      status: 'REVIEW_READY',
      createdAt,
      updatedAt: createdAt,
    });

    const reviewResult = await service.startReviewReady(ownerId, adaptationId);
    expect(adaptationProjectService.update).toHaveBeenCalledWith(
      { id: adaptationId },
      { status: 'REVIEW_READY' },
    );
    expect(reviewResult.status).toBe('review_ready');

    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      status: 'REVIEW_READY',
    });
    adaptationProjectService.update.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线。',
      mustPreserve: '保留雾港秘密。',
      rightsConfirmedAt: createdAt,
      status: 'DELIVERABLE',
      createdAt,
      updatedAt: createdAt,
    });

    const deliverableResult = await service.startDeliverable(ownerId, adaptationId);
    expect(adaptationProjectService.update).toHaveBeenLastCalledWith(
      { id: adaptationId },
      { status: 'DELIVERABLE' },
    );
    expect(deliverableResult.status).toBe('deliverable');
  });

  it('anchors a planned scene to a real source chapter and rejects unknown scenes', async () => {
    const sceneOutline = [
      { sceneNumber: 1, title: '码头重逢', synopsis: '女主回到雾港码头。', sourceChapterIds: [] },
    ];
    const scenePlanId = 'ab1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
    const mappingId = '5e4d3c2b-1a0f-9e8d-7c6b-5a4f3e2d1c0b';
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      status: 'SCENE_PLANNING',
    });
    adaptationSourceSnapshotService.getById.mockResolvedValue({ id: snapshotId, adaptationId });
    adaptationSourceChapterService.getById.mockResolvedValue({
      id: sourceChapterId,
      snapshotId,
      chapterNumber: 1,
      title: '迟到的信件',
    });
    scenePlanService.get.mockResolvedValue({
      id: scenePlanId,
      adaptationId,
      episodeNumber: 1,
      sceneOutline,
    });
    sourceSceneMappingService.create.mockResolvedValue({
      id: mappingId,
      adaptationId,
      scenePlanId,
      episodeNumber: 1,
      sceneNumber: 1,
      sourceChapterId,
      evidenceAnchor: null,
      status: 'PROPOSED',
      createdAt,
      updatedAt: createdAt,
    });

    const mapping = await service.createSourceSceneMapping(ownerId, adaptationId, {
      episodeNumber: 1,
      sceneNumber: 1,
      sourceChapterId,
    });

    expect(sourceSceneMappingService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scenePlan: { connect: { id: scenePlanId } },
        sourceChapter: { connect: { id: sourceChapterId } },
        episodeNumber: 1,
        sceneNumber: 1,
        status: 'PROPOSED',
      }),
    );
    expect(mapping).toMatchObject({
      status: 'proposed',
      sourceChapter: { id: sourceChapterId, title: '迟到的信件' },
    });

    // An unknown scene number must not produce an untraceable mapping.
    sourceSceneMappingService.create.mockClear();
    await expect(
      service.createSourceSceneMapping(ownerId, adaptationId, {
        episodeNumber: 1,
        sceneNumber: 99,
        sourceChapterId,
      }),
    ).rejects.toMatchObject({});
    expect(sourceSceneMappingService.create).not.toHaveBeenCalled();
  });

  it('resolves a source-scene mapping to confirmed or stale with an audit reason', async () => {
    const mappingId = '5e4d3c2b-1a0f-9e8d-7c6b-5a4f3e2d1c0b';
    adaptationProjectService.getById.mockResolvedValue({ id: adaptationId, currentSnapshotId: snapshotId, ownerId });
    sourceSceneMappingService.getById.mockResolvedValue({
      id: mappingId,
      adaptationId,
      scenePlanId: 'ab1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
      episodeNumber: 1,
      sceneNumber: 1,
      sourceChapterId,
      evidenceAnchor: null,
      status: 'PROPOSED',
      createdAt,
      updatedAt: createdAt,
    });
    adaptationSourceChapterService.getById.mockResolvedValue({
      id: sourceChapterId,
      snapshotId,
      chapterNumber: 1,
      title: '迟到的信件',
    });
    sourceSceneMappingService.update.mockResolvedValue({
      id: mappingId,
      adaptationId,
      scenePlanId: 'ab1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
      episodeNumber: 1,
      sceneNumber: 1,
      sourceChapterId,
      evidenceAnchor: null,
      status: 'STALE',
      createdAt,
      updatedAt: createdAt,
    });

    const result = await service.resolveSourceSceneMapping(ownerId, adaptationId, mappingId, {
      status: 'stale',
      reason: '原作该章节已被重写，需重新对照。',
    });

    expect(sourceSceneMappingService.update).toHaveBeenCalledWith(
      { id: mappingId },
      { status: 'STALE' },
    );
    expect(result.status).toBe('stale');
  });

  it('appends an immutable screenplay scene revision and rejects unknown scenes', async () => {
    const scenePlanId = 'ab1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
    const sceneOutline = [
      { sceneNumber: 1, title: '码头重逢', synopsis: '女主回到雾港码头。', sourceChapterIds: [] },
    ];
    const content = 'INT. 码头 - 夜\n\n女主撑伞走近，灯光在水面上碎裂。';
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      status: 'SCRIPT_WRITING',
    });
    scenePlanService.get.mockResolvedValue({
      id: scenePlanId,
      adaptationId,
      episodeNumber: 1,
      sceneOutline,
    });
    screenplayRevisionService.list.mockResolvedValue({
      list: [{ version: 2 }],
      total: 1,
      page: 1,
      limit: 1,
    });
    screenplayRevisionService.create.mockResolvedValue({
      id: '7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e',
      adaptationId,
      scenePlanId,
      episodeNumber: 1,
      sceneNumber: 1,
      source: 'AUTHOR',
      sourceRevisionId: null,
      version: 3,
      content,
      contentHash: 'a'.repeat(64),
      wordCount: 12,
      editSummary: '初稿',
      createdAt,
    });

    const revision = await service.createScreenplaySceneRevision(ownerId, adaptationId, {
      episodeNumber: 1,
      sceneNumber: 1,
      content,
      editSummary: '初稿',
    });

    expect(screenplayRevisionService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scenePlan: { connect: { id: scenePlanId } },
        sceneNumber: 1,
        version: 3,
        source: 'AUTHOR',
        editSummary: '初稿',
      }),
    );
    expect(revision).toMatchObject({ version: 3, source: 'author' });

    // A scene that was never planned must not get an orphan screenplay revision.
    screenplayRevisionService.create.mockClear();
    await expect(
      service.createScreenplaySceneRevision(ownerId, adaptationId, {
        episodeNumber: 1,
        sceneNumber: 99,
        content,
      }),
    ).rejects.toMatchObject({});
    expect(screenplayRevisionService.create).not.toHaveBeenCalled();
  });

  it('exports confirmed scene plans with their latest screenplay as a fountain', async () => {
    const scenePlanId = 'ab1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
    });
    adaptationSourceSnapshotService.getById.mockResolvedValue({
      id: snapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: '雾港来信',
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 2,
      createdAt,
    });
    scenePlanService.list.mockResolvedValue({
      list: [
        {
          id: scenePlanId,
          adaptationId,
          episodeNumber: 1,
          title: '雾港重逢',
          synopsis: '女主回到雾港码头。',
          sceneOutline: [
            {
              sceneNumber: 1,
              title: '码头重逢',
              synopsis: '女主与旧识相遇。',
              sourceChapterIds: [],
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      limit: 200,
    });
    screenplayRevisionService.list.mockResolvedValue({
      list: [{ content: 'INT. 码头 - 夜\n\n女主撑伞走近。' }],
      total: 1,
      page: 1,
      limit: 1,
    });

    const result = await service.exportAdaptation(ownerId, adaptationId, { format: 'fountain' });

    expect(result.contentType).toBe('text/plain');
    expect(result.filename).toBe('雾港来信-screenplay.fountain');
    expect(result.content).toContain('Title: 雾港来信');
    expect(result.content).toContain('第 1 集 · 雾港重逢');
    expect(result.content).toContain('INT. 码头 - 夜');
    expect(result.episodeCount).toBe(1);
    expect(result.sourceSnapshotId).toBe(snapshotId);
    expect(result.warnings).toEqual([]);
  });

  it('keeps independent screenplay scenes separate from novel projects and appends Fountain versions', async () => {
    const sceneId = 'd2d9a23c-742e-4ea2-a83f-2bb5cf4b9a73';
    const screenplayProject = {
      id: projectId,
      ownerId,
      title: '雾港来信（剧本）',
      format: 'screenplay',
      genre: '悬疑',
      premise: projectInput.premise,
      chapterCount: 12,
      targetWordsPerChapter: 1500,
      guidance: '',
      generateOutline: true,
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue(screenplayProject);
    standaloneScreenplaySceneService.getById.mockResolvedValue({
      id: sceneId,
      projectId,
      episodeNumber: 1,
      sceneNumber: 1,
      title: '码头重逢',
      synopsis: '林舟收到匿名录像。',
      status: 'DRAFT',
      createdAt,
      updatedAt: createdAt,
    });
    standaloneScreenplayRevisionService.list.mockResolvedValue({
      list: [{ version: 2 }],
      total: 1,
      page: 1,
      limit: 1,
    });
    standaloneScreenplayRevisionService.create.mockResolvedValue({
      id: '928a8319-55e9-481f-99b4-4a0d6d7ee8ac',
      projectId,
      sceneId,
      version: 3,
      content: 'INT. 码头 - 夜\n\n林舟看向录像机。',
      contentHash: createHash('sha256').update('INT. 码头 - 夜\n\n林舟看向录像机。').digest('hex'),
      wordCount: 2,
      editSummary: '强化开场悬念',
      createdAt,
    });

    const revision = await service.createStandaloneScreenplayRevision(ownerId, projectId, sceneId, {
      content: 'INT. 码头 - 夜\n\n林舟看向录像机。',
      editSummary: '强化开场悬念',
    });

    expect(standaloneScreenplayRevisionService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        project: { connect: { id: projectId } },
        scene: { connect: { id: sceneId } },
        version: 3,
      }),
    );
    expect(revision).toMatchObject({ sceneId, version: 3, editSummary: '强化开场悬念' });

    await expect(
      service.createStandaloneScreenplayRevision(ownerId, projectId, sceneId, {
        content: '林舟看向录像机。',
      }),
    ).rejects.toMatchObject({});
    expect(standaloneScreenplayRevisionService.create).toHaveBeenCalledTimes(1);

    projectService.getById.mockResolvedValue({ ...screenplayProject, format: 'novel' });
    await expect(
      service.listStandaloneScreenplayScenes(ownerId, projectId, { page: 1, limit: 20 }),
    ).rejects.toMatchObject({});
  });

  it('refuses to export a screenplay when no scene plan is confirmed', async () => {
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
    });
    adaptationSourceSnapshotService.getById.mockResolvedValue({
      id: snapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: '雾港来信',
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 2,
      createdAt,
    });
    scenePlanService.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 200 });

    await expect(
      service.exportAdaptation(ownerId, adaptationId, { format: 'txt' }),
    ).rejects.toMatchObject({});
  });

  it('detects source chapters finalized after the adaptation snapshot', async () => {
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
    });
    adaptationSourceSnapshotService.getById.mockResolvedValue({
      id: snapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: '雾港来信',
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 2,
      createdAt,
    });
    // Snapshot captured chapters 1 and 2.
    adaptationSourceChapterService.list.mockResolvedValue({
      list: [
        { chapterNumber: 1 },
        { chapterNumber: 2 },
      ],
      total: 2,
      page: 1,
      limit: 500,
    });
    // Source novel has since finalized chapter 3 as well.
    chapterFinalPointerService.list.mockResolvedValue({
      list: [{ chapterNumber: 1 }, { chapterNumber: 2 }, { chapterNumber: 3 }],
      total: 3,
      page: 1,
      limit: 500,
    });
    chapterPlanService.list.mockResolvedValue({
      list: [
        { chapterNumber: 1, title: '迟到的信件' },
        { chapterNumber: 2, title: '码头的重逢' },
        { chapterNumber: 3, title: '失踪的证人' },
      ],
      total: 3,
      page: 1,
      limit: 500,
    });

    const drift = await service.listAdaptationSourceDrift(ownerId, adaptationId);

    expect(drift.snapshotChapterCount).toBe(2);
    expect(drift.newChapters).toEqual([{ chapterNumber: 3, title: '失踪的证人' }]);
  });

  it('marks all non-stale source-scene mappings for re-review', async () => {
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId, currentSnapshotId: snapshotId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
    });
    sourceSceneMappingService.updateMany.mockResolvedValue({ count: 4 });

    const result = await service.markSourceSceneMappingsStale(ownerId, adaptationId);

    expect(sourceSceneMappingService.updateMany).toHaveBeenCalledWith(
      { adaptationId, status: { not: 'STALE' } },
      { status: 'STALE' },
    );
    expect(result).toEqual({ markedStaleCount: 4 });
  });

  it('generates a new immutable snapshot and repoints the adaptation on resnapshot', async () => {
    const newSnapshotId = '8f2c4d6e-9a01-4b3c-8d2e-1b5f6a7c8d9f';
    const baseAdaptation = {
      id: adaptationId,
      ownerId,
      sourceProjectId: projectId,
      targetFormat: 'SERIES',
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线。',
      mustPreserve: '保留雾港秘密。',
      rightsConfirmedAt: createdAt,
      status: 'SCENE_PLANNING',
      createdAt,
      updatedAt: createdAt,
    };
    adaptationProjectService.getById
      .mockResolvedValueOnce({ ...baseAdaptation, currentSnapshotId: snapshotId })
      .mockResolvedValueOnce({ ...baseAdaptation, currentSnapshotId: newSnapshotId });
    projectService.getById.mockResolvedValue({
      id: projectId,
      title: '雾港来信',
      chapterCount: 20,
      updatedAt: createdAt,
    });
    chapterFinalPointerService.list.mockResolvedValue({
      list: [{ chapterNumber: 1, revisionId: 'rev-1' }],
      total: 1,
      page: 1,
      limit: 20,
    });
    chapterRevisionService.getById.mockResolvedValue({
      id: 'rev-1',
      chapterNumber: 1,
      chapterPlanId: 'plan-1',
      content: '雨声先于信件抵达。',
      contentHash: 'a'.repeat(64),
      wordCount: 8,
    });
    chapterPlanService.getById.mockResolvedValue({
      chapterNumber: 1,
      title: '迟到的信件',
      projectId,
    });
    adaptationSourceSnapshotService.create.mockResolvedValue({
      id: newSnapshotId,
      adaptationId,
      sourceProjectId: projectId,
      sourceProjectTitle: '雾港来信',
      sourceProjectUpdatedAt: createdAt,
      sourceChapterCount: 1,
      createdAt,
    });
    adaptationSourceChapterService.createMany.mockResolvedValue({ count: 1 });
    sourceSceneMappingService.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.createAdaptationResnapshot(ownerId, adaptationId);

    expect(adaptationSourceSnapshotService.create).toHaveBeenCalledWith(
      expect.objectContaining({ sourceProjectTitle: '雾港来信', sourceChapterCount: 1 }),
    );
    expect(adaptationProjectService.update).toHaveBeenCalledWith(
      { id: adaptationId },
      { currentSnapshot: { connect: { id: newSnapshotId } } },
    );
    expect(sourceSceneMappingService.updateMany).toHaveBeenCalledWith(
      { adaptationId, status: { not: 'STALE' } },
      { status: 'STALE' },
    );
    expect(result.sourceSnapshot.id).toBe(newSnapshotId);
  });

  it('upserts a comparative-review verdict annotation only during review', async () => {
    const scenePlanId = 'ab1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
    adaptationProjectService.getById.mockResolvedValue({
      id: adaptationId,
      ownerId,
      sourceProjectId: projectId,
      currentSnapshotId: snapshotId,
      targetFormat: 'SERIES',
      status: 'REVIEW_READY',
    });
    scenePlanService.get.mockResolvedValue({
      id: scenePlanId,
      adaptationId,
      episodeNumber: 1,
      sceneOutline: [{ sceneNumber: 1, title: '码头重逢', sourceChapterIds: [] }],
    });
    reviewAnnotationService.get.mockResolvedValue(null);
    reviewAnnotationService.create.mockResolvedValue({
      id: '9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
      adaptationId,
      episodeNumber: 1,
      sceneNumber: 1,
      verdict: 'FAITHFUL',
      note: '场景与来源开场一致。',
      createdAt,
      updatedAt: createdAt,
    });

    const result = await service.upsertAdaptationReviewAnnotation(ownerId, adaptationId, {
      episodeNumber: 1,
      sceneNumber: 1,
      verdict: 'faithful',
      note: '场景与来源开场一致。',
    });

    expect(reviewAnnotationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        verdict: 'FAITHFUL',
        episodeNumber: 1,
        sceneNumber: 1,
        note: '场景与来源开场一致。',
      }),
    );
    expect(result).toMatchObject({ verdict: 'faithful', episodeNumber: 1, sceneNumber: 1 });
  });

  it('projects a dispatch failure after persisting the project and queued run', async () => {
    projectService.create.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    runService.create.mockResolvedValue({ id: runId });
    runtimeClient.createJob.mockRejectedValue(new Error('runtime unavailable'));
    runService.update.mockResolvedValue({
      id: runId,
      projectId,
      status: 'FAILED',
      progress: 100,
      currentStep: 'Generation service unavailable',
      error: '创作运行时暂时不可用，请稍后重试。',
      createdAt,
      updatedAt: createdAt,
    });

    await expect(service.createProject(ownerId, projectInput)).rejects.toMatchObject({});

    const createdRunId = runService.create.mock.calls[0][0].id;
    expect(projectEventService.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'GENERATION_STATUS',
        payload: expect.objectContaining({ runId: createdRunId, status: 'failed', progress: 100 }),
      }),
    );
    expect(projectService.update).toHaveBeenCalledWith({ id: projectId }, { updatedAt: createdAt });
  });

  it('persists active runtime progress without requiring an author to poll the job endpoint', async () => {
    const activeRun = {
      id: runId,
      projectId,
      status: 'QUEUED',
      type: 'BLUEPRINT',
      progress: 0,
      currentStep: 'Queued for generation',
      architecture: null,
      outline: null,
      chapterContent: null,
      factChanges: [],
      modelConfig: {},
      attemptCount: 0,
      error: null,
      createdAt,
      updatedAt: createdAt,
      project: { ownerId },
    };
    runService.list.mockResolvedValue({ list: [activeRun], total: 1, page: 1, limit: 100 });
    runtimeClient.getJob.mockResolvedValue({
      id: runId,
      project: { id: projectId, ...projectInput },
      status: 'running',
      progress: 45,
      currentStep: 'Generating story architecture',
      attemptCount: 1,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
    runService.getById.mockResolvedValue(activeRun);
    runService.update.mockResolvedValue({
      ...activeRun,
      status: 'RUNNING',
      progress: 45,
      currentStep: 'Generating story architecture',
      project: undefined,
    });

    await service.syncActiveGenerationRuns();

    expect(runtimeClient.getJob).toHaveBeenCalledWith(ownerId, runId);
    expect(runService.update).toHaveBeenCalledWith(
      { id: runId },
      expect.objectContaining({ status: 'RUNNING', progress: 45 }),
    );
    expect(projectService.update).toHaveBeenCalledWith({ id: projectId }, { updatedAt: createdAt });
    expect(projectEventService.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GENERATION_STATUS' }),
    );
  });

  it('snapshots every active-run page before synchronizing stateful runtime jobs', async () => {
    const activeRun = {
      id: runId,
      projectId,
      status: 'QUEUED',
      type: 'BLUEPRINT',
      progress: 0,
      currentStep: 'Queued for generation',
      architecture: null,
      outline: null,
      chapterContent: null,
      factChanges: [],
      modelConfig: {},
      attemptCount: 0,
      error: null,
      createdAt,
      updatedAt: createdAt,
      project: { ownerId },
    };
    runService.list
      .mockResolvedValueOnce({
        list: Array.from({ length: 100 }, () => activeRun),
        total: 101,
        page: 1,
        limit: 100,
      })
      .mockResolvedValueOnce({ list: [activeRun], total: 101, page: 2, limit: 100 });
    runService.getById.mockResolvedValue(activeRun);
    runService.update.mockResolvedValue({
      ...activeRun,
      status: 'RUNNING',
      progress: 45,
      currentStep: 'Generating story architecture',
      project: undefined,
    });
    runtimeClient.getJob.mockResolvedValue({
      id: runId,
      project: { id: projectId, ...projectInput },
      status: 'running',
      progress: 45,
      currentStep: 'Generating story architecture',
      attemptCount: 1,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });

    await service.syncActiveGenerationRuns();

    expect(runService.list).toHaveBeenNthCalledWith(
      1,
      { status: { in: ['QUEUED', 'RUNNING'] } },
      { page: 1, limit: 100, orderBy: { updatedAt: 'asc' } },
      { include: { project: { select: { ownerId: true } } } },
    );
    expect(runService.list).toHaveBeenNthCalledWith(
      2,
      { status: { in: ['QUEUED', 'RUNNING'] } },
      { page: 2, limit: 100, orderBy: { updatedAt: 'asc' } },
      { include: { project: { select: { ownerId: true } } } },
    );
    expect(runService.list.mock.invocationCallOrder[1]).toBeLessThan(
      runtimeClient.getJob.mock.invocationCallOrder[0],
    );
  });

  it('preserves previously persisted run artifacts when a progress poll has no artifact payload', async () => {
    const activeRun = {
      id: runId,
      projectId,
      status: 'RUNNING',
      type: 'BLUEPRINT',
      progress: 55,
      currentStep: 'Generating story architecture',
      architecture: '已保存的故事架构',
      outline: '已保存的目录',
      chapterContent: '已保存的章节正文',
      factChanges: [{ subject: '林雾' }],
      modelConfig: { model: 'test' },
      attemptCount: 1,
      error: null,
      createdAt,
      updatedAt: createdAt,
      project: { ownerId },
    };
    runService.list.mockResolvedValue({ list: [activeRun], total: 1, page: 1, limit: 100 });
    runService.getById.mockResolvedValue(activeRun);
    runtimeClient.getJob.mockResolvedValue({
      id: runId,
      project: { id: projectId, ...projectInput },
      status: 'running',
      progress: 60,
      currentStep: 'Generating chapter outline',
      attemptCount: 1,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
    runService.update.mockResolvedValue({ ...activeRun, progress: 60 });

    await service.syncActiveGenerationRuns();

    expect(runService.update).toHaveBeenCalledWith(
      { id: runId },
      expect.objectContaining({
        architecture: '已保存的故事架构',
        outline: '已保存的目录',
        chapterContent: '已保存的章节正文',
        factChanges: [{ subject: '林雾' }],
      }),
    );
  });

  it('resumes the project event stream after the browser last-event cursor without replaying it', async () => {
    const cursorEvent = {
      id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
      projectId,
      type: 'GENERATION_STATUS',
      payload: {},
      createdAt,
    };
    const nextEvent = {
      id: 'ff7c3a22-5b20-43f8-85ca-41f7eb7f75be',
      projectId,
      type: 'GENERATION_STATUS',
      payload: { status: 'running' },
      createdAt: new Date('2026-07-24T02:01:00.000Z'),
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    projectEventService.getById.mockResolvedValue(cursorEvent);
    projectEventService.list.mockResolvedValue({
      list: [nextEvent],
      total: 1,
      page: 1,
      limit: 100,
    });
    const controller = new AbortController();
    const stream = service.streamProjectEvents(
      ownerId,
      projectId,
      controller.signal,
      cursorEvent.id,
    );

    await expect(stream.next()).resolves.toMatchObject({
      value: { id: nextEvent.id, event: 'studio-project-event' },
    });

    expect(projectEventService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        OR: [{ createdAt: { gt: createdAt } }, { createdAt, id: { gt: cursorEvent.id } }],
      }),
      { page: 1, limit: 100, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    );
    controller.abort();
    await stream.return(undefined);
  });

  it('does not send an invalid SSE last-event cursor to the database layer', async () => {
    const nextEvent = {
      id: 'ff7c3a22-5b20-43f8-85ca-41f7eb7f75be',
      projectId,
      type: 'GENERATION_STATUS',
      payload: { status: 'running' },
      createdAt,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    projectEventService.list.mockResolvedValue({
      list: [nextEvent],
      total: 1,
      page: 1,
      limit: 100,
    });
    const controller = new AbortController();
    const stream = service.streamProjectEvents(ownerId, projectId, controller.signal, 'not-a-uuid');

    await expect(stream.next()).resolves.toMatchObject({ value: { id: nextEvent.id } });

    expect(projectEventService.getById).not.toHaveBeenCalled();
    controller.abort();
    await stream.return(undefined);
  });

  it('retains the legacy manuscript bytes while returning a deterministic chapter preview', async () => {
    const content = '第 1 章 雨夜\n林雾回到雾港。\n\n第 2 章 信件\n门缝下多了一封信。';
    const contentBase64 = Buffer.from(content, 'utf8').toString('base64');
    projectImportService.create.mockResolvedValue({
      id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
      filename: '雾港.txt',
    });

    await expect(
      service.previewProjectImport(ownerId, {
        filename: '雾港.txt',
        contentBase64,
      }),
    ).resolves.toMatchObject({
      importId: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
      sourceFormat: 'txt',
      chapters: [
        { chapterNumber: 1, title: '第 1 章 雨夜', characterCount: 7 },
        { chapterNumber: 2, title: '第 2 章 信件', characterCount: 9 },
      ],
    });

    expect(projectImportService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId,
        sourceContentBase64: contentBase64,
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    );
  });

  it('parses the fixed ten-chapter acceptance manuscript without dropping chapter boundaries', async () => {
    const content = readFileSync(
      join(__dirname, 'fixtures', 'ten-chapter-acceptance-sample.md'),
      'utf8',
    );
    const contentBase64 = Buffer.from(content, 'utf8').toString('base64');
    projectImportService.create.mockResolvedValue({
      id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
      filename: 'ten-chapter-acceptance-sample.md',
    });

    const preview = await service.previewProjectImport(ownerId, {
      filename: 'ten-chapter-acceptance-sample.md',
      format: 'md',
      contentBase64,
    });

    expect(preview.sourceFormat).toBe('md');
    expect(preview.chapters).toHaveLength(10);
    expect(preview.chapters[0]).toMatchObject({ chapterNumber: 1, title: '第 1 章 雨夜来信' });
    expect(preview.chapters[9]).toMatchObject({ chapterNumber: 10, title: '第 10 章 雾散之后' });
  });

  it('returns the existing project when an import confirmation is repeated', async () => {
    const importId = 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817';
    projectImportService.getById.mockResolvedValue({
      id: importId,
      ownerId,
      status: 'IMPORTED',
      projectId,
    });
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });

    await expect(
      service.confirmProjectImport(ownerId, importId, {
        title: '雾港来信',
        genre: '悬疑',
        guidance: '',
        targetWordsPerChapter: 3000,
      }),
    ).resolves.toMatchObject({
      importId,
      project: { id: projectId, title: '雾港来信' },
      importedChapterCount: 20,
    });
    expect(projectService.create).not.toHaveBeenCalled();
  });

  it('returns the persisted run when the runtime is unavailable after ownership is verified', async () => {
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId,
      ...projectInput,
    });
    runService.getById.mockResolvedValue({
      id: runId,
      projectId,
      status: 'RUNNING',
      progress: 55,
      currentStep: 'Generating story architecture',
      architecture: null,
      outline: null,
      error: null,
      createdAt,
      updatedAt: createdAt,
    });
    runtimeClient.getJob.mockRejectedValue(new Error('runtime unavailable'));

    await expect(service.getJob(ownerId, runId)).resolves.toMatchObject({
      id: runId,
      status: 'running',
      progress: 55,
      project: { id: projectId, title: projectInput.title },
    });
    expect(runService.update).not.toHaveBeenCalled();
  });

  it('returns a cancelled run from persisted state without polling the runtime again', async () => {
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    runService.getById.mockResolvedValue({
      id: runId,
      projectId,
      status: 'CANCELLED',
      type: 'BLUEPRINT',
      progress: 32,
      currentStep: 'Generation cancelled by author',
      architecture: null,
      outline: null,
      chapterContent: null,
      factChanges: [],
      error: null,
      createdAt,
      updatedAt: createdAt,
    });

    await expect(service.getJob(ownerId, runId)).resolves.toMatchObject({
      id: runId,
      status: 'cancelled',
      progress: 32,
    });

    expect(runtimeClient.getJob).not.toHaveBeenCalled();
  });

  it('synchronizes runtime artifacts into the persisted run before returning them', async () => {
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId,
      ...projectInput,
    });
    runService.getById.mockResolvedValue({
      id: runId,
      projectId,
      status: 'RUNNING',
      progress: 70,
      currentStep: 'Generating chapter outline',
      architecture: null,
      outline: null,
      error: null,
      createdAt,
      updatedAt: createdAt,
    });
    runtimeClient.getJob.mockResolvedValue({
      id: runId,
      project: { id: projectId, ...projectInput },
      status: 'succeeded',
      progress: 100,
      currentStep: 'Generation complete',
      artifact: { architecture: '架构', outline: '目录' },
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
    runService.update.mockResolvedValue({
      id: runId,
      projectId,
      status: 'SUCCEEDED',
      progress: 100,
      currentStep: 'Generation complete',
      architecture: '架构',
      outline: '目录',
      error: null,
      createdAt,
      updatedAt: createdAt,
    });

    await expect(service.getJob(ownerId, runId)).resolves.toMatchObject({
      status: 'succeeded',
      artifact: { architecture: '架构', outline: '目录' },
    });
    expect(runService.update).toHaveBeenCalledWith(
      { id: runId },
      expect.objectContaining({
        status: 'SUCCEEDED',
        architecture: '架构',
        outline: '目录',
      }),
    );
  });

  it('does not expose a run that belongs to another author', async () => {
    runService.getById.mockResolvedValue({ id: runId, projectId });
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId: projectId,
      ...projectInput,
    });

    await expect(service.getJob(ownerId, runId)).rejects.toMatchObject({});
    expect(runtimeClient.getJob).not.toHaveBeenCalled();
  });

  it('exposes deduplicated chapter plans that require review in the project overview', async () => {
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterFinalPointerService.count.mockResolvedValue(2);
    chapterPlanService.list.mockResolvedValue({
      list: [{ chapterNumber: 2 }, { chapterNumber: 2 }, { chapterNumber: 7 }],
      total: 3,
      page: 1,
      limit: 500,
    });
    factChangeService.count.mockResolvedValue(1);
    factService.count.mockResolvedValue(4);
    reviewFindingService.count.mockResolvedValue(3);
    finalizationOutboxTaskService.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    await expect(service.getProjectOverview(ownerId, projectId)).resolves.toEqual({
      projectId,
      finalizedChapterCount: 2,
      pendingChapterReviewNumbers: [2, 7],
      pendingFactChangeCount: 1,
      confirmedFactCount: 4,
      blockingFindingCount: 3,
      pendingFinalizationTaskCount: 2,
      failedFinalizationTaskCount: 1,
    });
    expect(chapterPlanService.list).toHaveBeenCalledWith(
      { projectId, needsReview: true },
      { page: 1, limit: 500, orderBy: { chapterNumber: 'asc' } },
    );
  });

  it('lists only the current author projects with their latest persisted run', async () => {
    projectService.list.mockResolvedValue({
      list: [
        {
          id: projectId,
          ownerId,
          ...projectInput,
          createdAt,
          updatedAt: createdAt,
          runs: [
            {
              id: runId,
              status: 'RUNNING',
              progress: 55,
              currentStep: 'Generating story architecture',
              createdAt,
              updatedAt: createdAt,
            },
          ],
          chapterFinalPointers: [{ id: 'f10f2f08-f28b-48cc-88d2-84f1e9f13785' }],
          facts: [{ id: 'd9273d5d-eaef-4308-833e-806cc4eb6f95' }],
          reviewFindings: [{ id: '3f9a10af-26ea-4cee-8d9c-053aa42d0802' }],
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    await expect(service.listProjects(ownerId, { page: 1, limit: 20 })).resolves.toEqual({
      list: [
        {
          id: projectId,
          title: projectInput.title,
          format: projectInput.format,
          genre: projectInput.genre,
          chapterCount: projectInput.chapterCount,
          targetWordsPerChapter: projectInput.targetWordsPerChapter,
          createdAt: createdAt.toISOString(),
          updatedAt: createdAt.toISOString(),
          finalizedChapterCount: 1,
          confirmedFactCount: 1,
          blockingFindingCount: 1,
          latestRun: {
            id: runId,
            status: 'running',
            progress: 55,
            currentStep: 'Generating story architecture',
            updatedAt: createdAt.toISOString(),
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    expect(projectService.list).toHaveBeenCalledWith(
      { ownerId },
      { page: 1, limit: 20, orderBy: { updatedAt: 'desc' } },
      expect.objectContaining({ include: expect.any(Object) }),
    );
  });

  it('publishes a pending project event as soon as an author retries a finalization task', async () => {
    const taskId = 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817';
    const retryableTask = {
      id: taskId,
      finalizationId: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      projectId,
      revisionId: runId,
      chapterNumber: 1,
      type: 'INDEX',
      status: 'RECOVERABLE',
      attemptCount: 2,
      lastError: '索引服务暂时不可用',
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    finalizationOutboxTaskService.getById.mockResolvedValue(retryableTask);
    finalizationOutboxTaskService.update.mockResolvedValue({
      ...retryableTask,
      status: 'PENDING',
      lastError: null,
    });

    await service.retryFinalizationTask(ownerId, projectId, taskId);

    expect(projectEventService.create).toHaveBeenCalledWith({
      project: { connect: { id: projectId } },
      type: 'FINALIZATION_TASK_STATUS',
      payload: { taskId, status: 'pending', type: 'index', attemptCount: 2 },
    });
  });

  it('records the author who retries a failed generation run', async () => {
    const failedRun = {
      id: runId,
      projectId,
      status: 'FAILED',
      type: 'BLUEPRINT',
      progress: 100,
      currentStep: 'Generation failed',
      architecture: null,
      outline: null,
      chapterContent: null,
      factChanges: [],
      modelConfig: {},
      attemptCount: 1,
      error: '运行时暂时不可用',
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    runService.getById.mockResolvedValue(failedRun);
    runtimeClient.retryJob.mockResolvedValue({
      id: runId,
      project: { id: projectId, ...projectInput },
      status: 'queued',
      progress: 0,
      currentStep: 'Queued for recovery',
      attemptCount: 2,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
    runService.update.mockResolvedValue({
      ...failedRun,
      status: 'QUEUED',
      progress: 0,
      currentStep: 'Queued for recovery',
      attemptCount: 2,
      error: null,
    });

    await service.retryJob(ownerId, runId);

    expect(auditLogService.logUpdate).toHaveBeenCalledWith(
      'studio.generation_run',
      runId,
      ownerId,
      { action: 'retry' },
      { projectId },
    );
  });

  it('rejects a retry for an active generation before contacting the runtime', async () => {
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    runService.getById.mockResolvedValue({
      id: runId,
      projectId,
      status: 'RUNNING',
      type: 'BLUEPRINT',
      progress: 45,
      currentStep: 'Generating story architecture',
      architecture: null,
      outline: null,
      chapterContent: null,
      factChanges: [],
      error: null,
      createdAt,
      updatedAt: createdAt,
    });

    await expect(service.retryJob(ownerId, runId)).rejects.toMatchObject({});

    expect(runtimeClient.retryJob).not.toHaveBeenCalled();
  });

  it('returns the latest versioned blueprint only after verifying project ownership', async () => {
    blueprintService.list.mockResolvedValue({
      list: [
        {
          id: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
          projectId,
          runId,
          version: 1,
          status: 'DRAFT',
          architecture: '雾港的秘密由一封迟到的信件揭开。',
          outline: '第 1 章：信件抵达',
          source: 'ai',
          schemaVersion: 1,
          contentHash: 'a'.repeat(64),
          createdAt,
          updatedAt: createdAt,
        },
      ],
      total: 1,
      page: 1,
      limit: 1,
    });
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId,
      ...projectInput,
    });

    await expect(service.getBlueprint(ownerId, projectId)).resolves.toMatchObject({
      projectId,
      version: 1,
      status: 'draft',
      architecture: '雾港的秘密由一封迟到的信件揭开。',
    });
    expect(blueprintService.list).toHaveBeenCalledTimes(1);
  });

  it('creates a new editable version when an author changes a confirmed blueprint', async () => {
    const confirmedBlueprint = {
      id: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
      projectId,
      runId,
      version: 1,
      status: 'CONFIRMED',
      architecture: '初始架构',
      outline: '初始目录',
      source: 'ai',
      schemaVersion: 1,
      contentHash: 'a'.repeat(64),
      createdAt,
      updatedAt: createdAt,
    };
    const draftBlueprint = {
      ...confirmedBlueprint,
      id: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      runId: null,
      version: 2,
      status: 'DRAFT',
      architecture: '作者修订后的架构',
      source: 'author',
    };
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId,
      ...projectInput,
    });
    blueprintService.list.mockResolvedValue({
      list: [confirmedBlueprint],
      total: 1,
      page: 1,
      limit: 1,
    });
    blueprintService.create.mockResolvedValue(draftBlueprint);

    await expect(
      service.updateBlueprint(ownerId, projectId, {
        architecture: '作者修订后的架构',
        outline: '初始目录',
      }),
    ).resolves.toMatchObject({ version: 2, status: 'draft', source: 'author' });
    expect(blueprintService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 2,
        status: 'DRAFT',
        source: 'author',
      }),
    );
  });

  it('confirms the latest blueprint and updates the project pointer in one unit of work', async () => {
    const draftBlueprint = {
      id: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
      projectId,
      runId,
      version: 1,
      status: 'DRAFT',
      architecture: '雾港的秘密由一封迟到的信件揭开。',
      outline: '第 1 章：信件抵达',
      source: 'ai',
      schemaVersion: 1,
      contentHash: 'a'.repeat(64),
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId,
      ...projectInput,
    });
    blueprintService.list.mockResolvedValue({
      list: [draftBlueprint],
      total: 1,
      page: 1,
      limit: 1,
    });
    blueprintService.update.mockResolvedValue({
      ...draftBlueprint,
      status: 'CONFIRMED',
    });
    projectService.update.mockResolvedValue({ id: projectId });

    await expect(service.confirmBlueprint(ownerId, projectId)).resolves.toMatchObject({
      status: 'confirmed',
    });
    expect(blueprintService.update).toHaveBeenCalledWith(
      { id: draftBlueprint.id },
      { status: 'CONFIRMED' },
    );
    expect(projectService.update).toHaveBeenCalledWith(
      { id: projectId },
      { currentBlueprint: { connect: { id: draftBlueprint.id } } },
    );
    expect(auditLogService.logUpdate).toHaveBeenCalledWith(
      'studio.blueprint',
      draftBlueprint.id,
      ownerId,
      { status: 'confirmed' },
      { projectId, version: 1 },
    );
  });

  it('creates a structured draft for a chapter only from the confirmed blueprint', async () => {
    const blueprintId = '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c';
    const chapterPlan = {
      id: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      projectId,
      blueprintId,
      chapterNumber: 1,
      version: 1,
      status: 'DRAFT',
      needsReview: false,
      title: '信件抵达',
      goal: '让主角决定重查失踪案。',
      conflict: '港口警长要求她交出信件。',
      characters: ['林雾', '周警长'],
      location: '雾港邮局',
      timeConstraint: '暴雨前的两小时',
      foreshadowing: '褪色的航运印章',
      hook: '信封背面出现新的笔迹。',
      source: 'author',
      schemaVersion: 1,
      contentHash: 'a'.repeat(64),
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId,
      currentBlueprintId: blueprintId,
      ...projectInput,
    });
    blueprintService.getById.mockResolvedValue({
      id: blueprintId,
      status: 'CONFIRMED',
    });
    chapterPlanService.list.mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      limit: 1,
    });
    chapterPlanService.create.mockResolvedValue(chapterPlan);
    const studio = service as unknown as {
      saveChapterPlan: (
        userId: string,
        projectId: string,
        chapterNumber: number,
        input: unknown,
      ) => Promise<unknown>;
    };

    await expect(
      studio.saveChapterPlan(ownerId, projectId, 1, {
        title: '信件抵达',
        goal: '让主角决定重查失踪案。',
        conflict: '港口警长要求她交出信件。',
        characters: ['林雾', '周警长'],
        location: '雾港邮局',
        timeConstraint: '暴雨前的两小时',
        foreshadowing: '褪色的航运印章',
        hook: '信封背面出现新的笔迹。',
      }),
    ).resolves.toMatchObject({
      chapterNumber: 1,
      status: 'draft',
      title: '信件抵达',
      characters: ['林雾', '周警长'],
    });
    expect(chapterPlanService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        chapterNumber: 1,
        version: 1,
        blueprint: { connect: { id: blueprintId } },
        status: 'DRAFT',
      }),
    );
  });

  it('confirms the latest chapter plan without changing its content', async () => {
    const blueprintId = '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c';
    const draftPlan = {
      id: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      projectId,
      blueprintId,
      chapterNumber: 1,
      version: 1,
      status: 'DRAFT',
      title: '信件抵达',
      goal: '让主角决定重查失踪案。',
      conflict: '',
      characters: ['林雾'],
      location: '雾港邮局',
      timeConstraint: '',
      foreshadowing: '',
      hook: '信封背面出现新的笔迹。',
      source: 'author',
      schemaVersion: 1,
      contentHash: 'a'.repeat(64),
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId,
      currentBlueprintId: blueprintId,
      ...projectInput,
    });
    blueprintService.getById.mockResolvedValue({
      id: blueprintId,
      status: 'CONFIRMED',
    });
    chapterPlanService.list.mockResolvedValue({
      list: [draftPlan],
      total: 1,
      page: 1,
      limit: 1,
    });
    chapterPlanService.update.mockResolvedValue({
      ...draftPlan,
      status: 'CONFIRMED',
    });

    await expect(service.confirmChapterPlan(ownerId, projectId, 1)).resolves.toMatchObject({
      status: 'confirmed',
      title: '信件抵达',
    });
    expect(chapterPlanService.update).toHaveBeenCalledWith(
      { id: draftPlan.id },
      { status: 'CONFIRMED', needsReview: false },
    );
  });

  it('queues a chapter draft only from the confirmed plan bound to the current blueprint', async () => {
    const blueprintId = '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c';
    const planId = '227dd8ce-b405-4609-bffc-e88f8842e1ab';
    const confirmedBlueprint = {
      id: blueprintId,
      projectId,
      version: 1,
      status: 'CONFIRMED',
      architecture: '雾港隐藏着一场旧案。',
      outline: '第 1 章：信件抵达',
      source: 'ai',
      schemaVersion: 1,
      contentHash: 'a'.repeat(64),
      createdAt,
      updatedAt: createdAt,
    };
    const confirmedPlan = {
      id: planId,
      projectId,
      blueprintId,
      chapterNumber: 1,
      version: 1,
      status: 'CONFIRMED',
      title: '信件抵达',
      goal: '让主角决定重查失踪案。',
      conflict: '港口警长要求她交出信件。',
      characters: ['林雾'],
      location: '雾港邮局',
      timeConstraint: '暴雨前两小时',
      foreshadowing: '褪色航运印章',
      hook: '信封背面出现新笔迹。',
      source: 'author',
      schemaVersion: 1,
      contentHash: 'b'.repeat(64),
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId,
      currentBlueprintId: blueprintId,
      ...projectInput,
    });
    blueprintService.getById.mockResolvedValue(confirmedBlueprint);
    chapterPlanService.list.mockResolvedValue({
      list: [confirmedPlan],
      total: 1,
      page: 1,
      limit: 1,
    });
    runService.create.mockResolvedValue({ id: runId });
    runService.update.mockResolvedValue({
      id: runId,
      projectId,
      chapterPlanId: planId,
      type: 'CHAPTER_DRAFT',
      status: 'QUEUED',
      progress: 0,
      currentStep: 'Queued for chapter draft',
      architecture: null,
      outline: null,
      chapterContent: null,
      error: null,
      createdAt,
      updatedAt: createdAt,
    });
    runtimeClient.createChapterDraftJob.mockResolvedValue({
      id: runId,
      project: { id: projectId, ...projectInput },
      status: 'queued',
      progress: 0,
      currentStep: 'Queued for chapter draft',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });

    await expect(
      service.createChapterDraft(ownerId, projectId, 1, { prompt: '开场先写雨声。' }),
    ).resolves.toMatchObject({ id: runId, status: 'queued' });
    expect(runService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CHAPTER_DRAFT',
        chapterPlan: { connect: { id: planId } },
        inputSummary: '开场先写雨声。',
      }),
    );
    expect(projectEventService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GENERATION_STATUS',
        payload: expect.objectContaining({ status: 'queued', progress: 0 }),
      }),
    );
    expect(projectEventService.create.mock.invocationCallOrder[0]).toBeLessThan(
      runtimeClient.createChapterDraftJob.mock.invocationCallOrder[0],
    );
    expect(projectService.update.mock.invocationCallOrder[0]).toBeLessThan(
      runtimeClient.createChapterDraftJob.mock.invocationCallOrder[0],
    );
    expect(auditLogService.logCreate).toHaveBeenCalledWith(
      'studio.generation_run',
      expect.any(String),
      ownerId,
      expect.objectContaining({
        action: 'create_chapter_draft',
        projectId,
        chapterNumber: 1,
        planId,
      }),
    );
    expect(runtimeClient.createChapterDraftJob).toHaveBeenCalledWith(
      ownerId,
      projectId,
      expect.any(String),
      projectInput,
      expect.objectContaining({ id: blueprintId }),
      expect.objectContaining({ id: planId }),
      { prompt: '开场先写雨声。' },
    );
  });

  it('projects a failed chapter-draft dispatch after its queued event is persisted', async () => {
    const blueprintId = '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c';
    const planId = '227dd8ce-b405-4609-bffc-e88f8842e1ab';
    projectService.getById.mockResolvedValue({
      id: projectId,
      ownerId,
      currentBlueprintId: blueprintId,
      ...projectInput,
    });
    blueprintService.getById.mockResolvedValue({ id: blueprintId, projectId, status: 'CONFIRMED' });
    chapterPlanService.list.mockResolvedValue({
      list: [
        {
          id: planId,
          projectId,
          blueprintId,
          chapterNumber: 1,
          status: 'CONFIRMED',
          needsReview: false,
        },
      ],
      total: 1,
      page: 1,
      limit: 1,
    });
    runtimeClient.createChapterDraftJob.mockRejectedValue(new Error('runtime unavailable'));
    runService.update.mockResolvedValue({
      id: runId,
      projectId,
      status: 'FAILED',
      progress: 100,
      currentStep: 'Chapter draft service unavailable',
      error: '章节草稿服务暂时不可用，请稍后重试。',
      createdAt,
      updatedAt: createdAt,
    });

    await expect(
      service.createChapterDraft(ownerId, projectId, 1, { prompt: '开场先写雨声。' }),
    ).rejects.toMatchObject({});

    const createdRunId = runService.create.mock.calls[0][0].id;
    expect(projectEventService.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'GENERATION_STATUS',
        payload: expect.objectContaining({ runId: createdRunId, status: 'failed', progress: 100 }),
      }),
    );
    expect(projectService.update).toHaveBeenCalledWith({ id: projectId }, { updatedAt: createdAt });
  });

  it('restores an immutable revision by moving only the current draft pointer', async () => {
    const revision = {
      id: runId,
      projectId,
      chapterPlanId: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      runId,
      chapterNumber: 1,
      version: 1,
      status: 'DRAFT',
      content: '雨声先于信件抵达。',
      wordCount: 1,
      promptSummary: '',
      source: 'ai',
      schemaVersion: 1,
      contentHash: 'a'.repeat(64),
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById.mockResolvedValue(revision);
    chapterDraftPointerService.upsert.mockResolvedValue({
      id: '98cc0808-e3d3-4313-b276-3c6608168f0a',
    });

    await expect(
      service.restoreChapterRevision(ownerId, projectId, 1, runId),
    ).resolves.toMatchObject({ id: runId, content: '雨声先于信件抵达。' });
    expect(chapterDraftPointerService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_chapterNumber: { projectId, chapterNumber: 1 } },
        update: { revision: { connect: { id: runId } } },
      }),
    );
    expect(chapterRevisionService.update).not.toHaveBeenCalled();
  });

  it('creates an immutable author revision from the current draft', async () => {
    const sourceRevision = {
      id: runId,
      projectId,
      chapterPlanId: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      runId,
      chapterNumber: 1,
      version: 1,
      status: 'DRAFT',
      content: '雨声先于信件抵达。',
      wordCount: 1,
      promptSummary: '',
      source: 'ai',
      sourceRevisionId: null,
      schemaVersion: 1,
      contentHash: 'a'.repeat(64),
      createdAt,
      updatedAt: createdAt,
    };
    const authorRevision = {
      ...sourceRevision,
      id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      runId: null,
      version: 2,
      content: '雨声先于信件抵达，林雾没有回头。',
      wordCount: 1,
      promptSummary: '补充林雾的反应。',
      source: 'author',
      sourceRevisionId: runId,
      contentHash: 'b'.repeat(64),
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById.mockResolvedValue(sourceRevision);
    chapterDraftPointerService.get.mockResolvedValue({ revisionId: runId });
    chapterRevisionService.list.mockResolvedValue({
      list: [sourceRevision],
      total: 1,
      page: 1,
      limit: 1,
    });
    chapterRevisionService.create.mockResolvedValue(authorRevision);
    chapterDraftPointerService.upsert.mockResolvedValue({
      id: '98cc0808-e3d3-4313-b276-3c6608168f0a',
    });

    await expect(
      service.createAuthorChapterRevision(ownerId, projectId, 1, runId, {
        content: authorRevision.content,
        editSummary: authorRevision.promptSummary,
      }),
    ).resolves.toMatchObject({
      id: authorRevision.id,
      source: 'author',
      sourceRevisionId: runId,
      editSummary: '补充林雾的反应。',
    });
    expect(chapterRevisionService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        chapterPlan: { connect: { id: sourceRevision.chapterPlanId } },
        sourceRevision: { connect: { id: runId } },
        source: 'author',
        content: authorRevision.content,
        promptSummary: authorRevision.promptSummary,
      }),
    );
    expect(chapterDraftPointerService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { revision: { connect: { id: authorRevision.id } } },
      }),
    );
  });

  it('returns a line-level immutable diff for two revisions of the same chapter', async () => {
    const baseRevision = {
      id: runId,
      projectId,
      chapterPlanId: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      runId,
      chapterNumber: 1,
      content: '雨声。\n信件抵达。\n',
      version: 1,
    };
    const comparisonRevision = {
      ...baseRevision,
      id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      runId: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      version: 2,
      content: '雨声。\n信件在午夜抵达。\n',
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById
      .mockResolvedValueOnce(baseRevision)
      .mockResolvedValueOnce(comparisonRevision);

    await expect(
      service.compareChapterRevisions(ownerId, projectId, 1, runId, comparisonRevision.id),
    ).resolves.toEqual({
      baseRevisionId: runId,
      comparisonRevisionId: comparisonRevision.id,
      segments: [
        { type: 'unchanged', text: '雨声。\n' },
        { type: 'added', text: '信件在午夜抵达。\n' },
        { type: 'removed', text: '信件抵达。\n' },
      ],
    });
  });

  it('creates a proposed fact change without writing to the confirmed fact layer', async () => {
    const revision = { id: runId, projectId, chapterNumber: 1 };
    const change = {
      id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      projectId,
      revisionId: runId,
      chapterNumber: 1,
      factId: null,
      operation: 'ADD',
      factType: 'character',
      subject: '林雾',
      predicate: 'knows',
      proposedValue: '旧案线索',
      rationale: '正文提及',
      evidence: '她握紧信件。',
      source: 'author',
      status: 'PROPOSED',
      resolvedValue: null,
      resolvedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById.mockResolvedValue(revision);
    factChangeService.create.mockResolvedValue(change);

    await expect(
      service.createFactChange(ownerId, projectId, 1, runId, {
        operation: 'add',
        factType: 'character',
        subject: '林雾',
        predicate: 'knows',
        proposedValue: '旧案线索',
        rationale: '正文提及',
        evidence: '她握紧信件。',
      }),
    ).resolves.toMatchObject({ status: 'proposed', subject: '林雾' });
    expect(factService.create).not.toHaveBeenCalled();
    expect(factChangeService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PROPOSED',
        source: 'author',
        operation: 'ADD',
      }),
    );
  });

  it('lists only confirmed facts as fact-change targets', async () => {
    const fact = {
      id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      projectId,
      factType: 'character',
      subject: '林雾',
      predicate: 'knows',
      value: '旧案线索',
      effectiveChapter: 1,
      status: 'CONFIRMED',
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    factService.list.mockResolvedValue({ list: [fact], total: 1, page: 1, limit: 100 });

    await expect(
      service.listFacts(ownerId, projectId, { page: 1, limit: 100 }),
    ).resolves.toMatchObject({ list: [{ id: fact.id, status: 'confirmed', value: '旧案线索' }] });
    expect(factService.list).toHaveBeenCalledWith(
      { projectId, status: 'CONFIRMED' },
      { page: 1, limit: 100, orderBy: { createdAt: 'desc' } },
    );
  });

  it('finalizes the current draft only after all fact proposals are resolved', async () => {
    const revision = {
      id: runId,
      projectId,
      chapterNumber: 1,
      status: 'DRAFT',
    };
    const finalization = {
      id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      projectId,
      revisionId: runId,
      chapterNumber: 1,
      status: 'FINALIZING',
      summaryStatus: 'PENDING',
      indexStatus: 'PENDING',
      finalizedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    };
    const pendingChange = {
      id: '98cc0808-e3d3-4313-b276-3c6608168f0a',
      projectId,
      revisionId: runId,
      chapterNumber: 1,
      factId: null,
      operation: 'ADD',
      factType: 'character',
      subject: '林雾',
      predicate: 'knows',
      proposedValue: '旧案线索',
      rationale: '',
      evidence: '',
      source: 'ai',
      status: 'ACCEPTED_PENDING_FINALIZATION',
      resolvedValue: '旧案线索',
      resolvedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById.mockResolvedValue(revision);
    chapterFinalizationService.getByRevisionId.mockResolvedValue(null);
    chapterDraftPointerService.get.mockResolvedValue({ revisionId: runId });
    factChangeService.count.mockResolvedValue(0);
    factChangeService.list.mockResolvedValue({
      list: [pendingChange],
      total: 1,
      page: 1,
      limit: 500,
    });
    chapterFinalPointerService.get.mockResolvedValue(null);
    chapterRevisionService.update.mockResolvedValue({ ...revision, status: 'FINALIZED' });
    chapterFinalPointerService.upsert.mockResolvedValue({ revisionId: runId });
    chapterFinalizationService.create.mockResolvedValue(finalization);
    chapterFinalizationService.update.mockResolvedValue({
      ...finalization,
      factSnapshotRecorded: true,
    });
    factService.create.mockResolvedValue({ id: pendingChange.id });

    await expect(
      service.finalizeChapterRevision(ownerId, projectId, 1, runId),
    ).resolves.toMatchObject({ revisionId: runId, status: 'finalizing', summaryStatus: 'pending' });
    expect(chapterRevisionService.update).toHaveBeenCalledWith(
      { id: runId },
      { status: 'FINALIZED' },
    );
    expect(chapterFinalPointerService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ chapterNumber: 1 }),
      }),
    );
    expect(chapterFinalizationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FINALIZING',
        summaryStatus: 'PENDING',
        indexStatus: 'PENDING',
      }),
    );
    expect(factService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceChange: { connect: { id: pendingChange.id } },
        status: 'CONFIRMED',
      }),
    );
    expect(factChangeService.update).toHaveBeenCalledWith(
      { id: pendingChange.id },
      expect.objectContaining({ status: 'ACCEPTED' }),
    );
    expect(finalizationOutboxTaskService.create).toHaveBeenCalledTimes(2);
    expect(chapterFinalizationService.update).toHaveBeenCalledWith(
      { id: finalization.id },
      { factSnapshotRecorded: true },
    );
    expect(finalizationFactSnapshotService.createMany).toHaveBeenCalledWith([]);
  });

  it('captures every confirmed fact when a finalization snapshot exceeds one page', async () => {
    const revision = { id: runId, projectId, chapterNumber: 1, status: 'DRAFT' };
    const finalization = {
      id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      projectId,
      revisionId: runId,
      chapterNumber: 1,
      status: 'FINALIZED',
      summaryStatus: 'PENDING',
      indexStatus: 'PENDING',
      finalizedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    };
    const facts = Array.from({ length: 501 }, (_, index) => ({
      id: `fact-${index}`,
      projectId,
      factType: 'character',
      subject: `角色 ${index}`,
      predicate: 'knows',
      value: `线索 ${index}`,
      effectiveChapter: 1,
      status: 'CONFIRMED',
      schemaVersion: 1,
    }));
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById.mockResolvedValue(revision);
    chapterFinalizationService.getByRevisionId.mockResolvedValue(null);
    chapterDraftPointerService.get.mockResolvedValue({ revisionId: runId });
    factChangeService.count.mockResolvedValue(0);
    factChangeService.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 500 });
    chapterFinalPointerService.get.mockResolvedValue(null);
    chapterFinalizationService.create.mockResolvedValue(finalization);
    chapterFinalizationService.update.mockResolvedValue(finalization);
    factService.list
      .mockResolvedValueOnce({ list: [], total: 0, page: 1, limit: 500 })
      .mockResolvedValueOnce({ list: facts.slice(0, 500), total: 501, page: 1, limit: 500 })
      .mockResolvedValueOnce({ list: facts.slice(500), total: 501, page: 2, limit: 500 });

    await service.finalizeChapterRevision(ownerId, projectId, 1, runId);

    expect(factService.list).toHaveBeenNthCalledWith(
      1,
      { projectId, status: 'CONFIRMED' },
      { page: 1, limit: 500, orderBy: { createdAt: 'asc' } },
    );
    expect(factService.list).toHaveBeenNthCalledWith(
      2,
      { projectId, status: 'CONFIRMED' },
      { page: 1, limit: 500, orderBy: { createdAt: 'asc' } },
    );
    expect(factService.list).toHaveBeenNthCalledWith(
      3,
      { projectId, status: 'CONFIRMED' },
      { page: 2, limit: 500, orderBy: { createdAt: 'asc' } },
    );
    expect(finalizationFactSnapshotService.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ sourceFactId: 'fact-0' }),
        expect.objectContaining({ sourceFactId: 'fact-500' }),
      ]),
    );
    expect(finalizationFactSnapshotService.createMany.mock.calls[0][0]).toHaveLength(501);
  });

  it('restores a finalized revision from its fact snapshot without retaining the later fact state', async () => {
    const revision = {
      id: runId,
      projectId,
      chapterPlanId: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      runId: null,
      chapterNumber: 1,
      version: 1,
      status: 'FINALIZED',
      content: '林雾握紧信件。',
      wordCount: 8,
      promptSummary: '',
      source: 'author',
      sourceRevisionId: null,
      schemaVersion: 1,
      contentHash: 'a'.repeat(64),
      createdAt,
      updatedAt: createdAt,
    };
    const finalization = {
      id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      projectId,
      revisionId: runId,
      chapterNumber: 1,
      status: 'FINALIZED',
      factSnapshotRecorded: true,
    };
    const snapshot = {
      id: '98cc0808-e3d3-4313-b276-3c6608168f0a',
      finalizationId: finalization.id,
      projectId,
      sourceFactId: 'c56ae2f4-443d-4fe0-bccc-fd27798bf921',
      factType: 'character',
      subject: '林雾',
      predicate: 'knows',
      value: '旧案线索',
      effectiveChapter: 1,
      status: 'CONFIRMED',
      schemaVersion: 1,
      createdAt,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById.mockResolvedValue(revision);
    chapterFinalizationService.getByRevisionId.mockResolvedValue(finalization);
    chapterPlanService.list.mockResolvedValue({
      list: [{ chapterNumber: 2 }],
      total: 1,
      page: 1,
      limit: 500,
    });
    finalizationFactSnapshotService.list.mockResolvedValue({
      list: [snapshot],
      total: 1,
      page: 1,
      limit: 500,
    });
    chapterFinalPointerService.get.mockResolvedValue({
      revisionId: '74cb3cba-a8a3-41f8-b6cb-6bfddd4ef445',
    });
    factService.getById.mockResolvedValue({ id: snapshot.sourceFactId, projectId });

    await expect(
      service.restoreFinalChapterRevision(ownerId, projectId, 1, runId),
    ).resolves.toMatchObject({
      revision: { id: runId, status: 'finalized' },
      restoredFactCount: 1,
      affectedChapterNumbers: [2],
    });

    expect(factService.updateMany).toHaveBeenCalledWith(
      { projectId, status: 'CONFIRMED' },
      { status: 'RETIRED' },
    );
    expect(chapterPlanService.updateMany).toHaveBeenCalledWith(
      { projectId, chapterNumber: { gt: 1 } },
      { needsReview: true },
    );
    expect(factService.update).toHaveBeenCalledWith(
      { id: snapshot.sourceFactId },
      expect.objectContaining({ value: '旧案线索', status: 'CONFIRMED' }),
    );
    expect(chapterDraftPointerService.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { revision: { connect: { id: runId } } } }),
    );
  });

  it('blocks finalization while fact proposals remain unresolved', async () => {
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById.mockResolvedValue({
      id: runId,
      projectId,
      chapterNumber: 1,
      status: 'DRAFT',
    });
    chapterFinalizationService.getByRevisionId.mockResolvedValue(null);
    chapterDraftPointerService.get.mockResolvedValue({ revisionId: runId });
    factChangeService.count.mockResolvedValue(1);

    await expect(
      service.finalizeChapterRevision(ownerId, projectId, 1, runId),
    ).rejects.toBeDefined();
    expect(chapterRevisionService.update).not.toHaveBeenCalled();
    expect(chapterFinalizationService.create).not.toHaveBeenCalled();
  });

  it('records an accepted fact update when a hard-fact finding is intentionally changed', async () => {
    const revision = { id: runId, projectId, chapterNumber: 1, status: 'DRAFT' };
    const finding = {
      id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      projectId,
      revisionId: runId,
      chapterNumber: 1,
      factId: '98cc0808-e3d3-4313-b276-3c6608168f0a',
      ruleId: 'hard-fact-negation',
      severity: 'BLOCKING',
      status: 'OPEN',
      evidenceStart: 0,
      evidenceEnd: 8,
      evidence: '林雾不是刑警。',
      suggestedAction: '记录有意变更。',
      createdAt,
      updatedAt: createdAt,
    };
    const fact = {
      id: finding.factId,
      projectId,
      factType: 'character',
      subject: '林雾',
      predicate: 'occupation',
      value: '刑警',
      status: 'CONFIRMED',
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById.mockResolvedValue(revision);
    reviewFindingService.getById.mockResolvedValue(finding);
    reviewFindingService.update.mockResolvedValue({
      ...finding,
      status: 'INTENTIONAL_CHANGE',
      resolutionReason: '剧情中职位发生变化。',
      resolvedAt: createdAt,
    });
    factService.getById.mockResolvedValue(fact);

    await expect(
      service.resolveReviewFinding(ownerId, projectId, 1, runId, finding.id, {
        decision: 'intentional_change',
        reason: '剧情中职位发生变化。',
        resolvedValue: '记者',
      }),
    ).resolves.toMatchObject({ status: 'intentional_change' });

    expect(factChangeService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        targetFact: { connect: { id: fact.id } },
        operation: 'UPDATE',
        proposedValue: '记者',
        status: 'ACCEPTED_PENDING_FINALIZATION',
        source: 'author',
      }),
    );
    expect(reviewFindingService.update).toHaveBeenCalledWith(
      { id: finding.id },
      expect.objectContaining({ status: 'INTENTIONAL_CHANGE' }),
    );
    expect(projectEventService.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'FACT_CHANGE_DECISION' }),
    );
  });

  it('accepts an add proposal without changing canonical facts before finalization', async () => {
    const change = {
      id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
      projectId,
      revisionId: runId,
      chapterNumber: 1,
      factId: null,
      operation: 'ADD',
      factType: 'character',
      subject: '林雾',
      predicate: 'knows',
      proposedValue: '旧案线索',
      rationale: '',
      evidence: '',
      source: 'ai',
      status: 'PROPOSED',
      resolvedValue: null,
      resolvedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    const accepted = {
      ...change,
      status: 'ACCEPTED_PENDING_FINALIZATION',
      resolvedValue: '旧案线索',
      resolvedAt: createdAt,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    chapterRevisionService.getById.mockResolvedValue({ id: runId, projectId, chapterNumber: 1 });
    factChangeService.getById.mockResolvedValue(change);
    factChangeService.update.mockResolvedValue(accepted);

    await expect(
      service.resolveFactChange(ownerId, projectId, 1, runId, change.id, {
        decision: 'accept',
      }),
    ).resolves.toMatchObject({
      status: 'accepted_pending_finalization',
      resolvedValue: '旧案线索',
    });
    expect(factService.create).not.toHaveBeenCalled();
    expect(factChangeService.update).toHaveBeenCalledWith(
      { id: change.id },
      expect.objectContaining({
        status: 'ACCEPTED_PENDING_FINALIZATION',
        resolvedValue: '旧案线索',
      }),
    );
  });

  it('persists AI fact proposals from a completed chapter draft exactly once', async () => {
    const chapterPlanId = '227dd8ce-b405-4609-bffc-e88f8842e1ab';
    const aiProposal = {
      operation: 'add',
      factType: 'character',
      subject: '林雾',
      predicate: 'knows',
      proposedValue: '旧案线索',
      rationale: '正文明确提及',
      evidence: '林雾握紧信件。',
      confidence: 0.9,
    };
    projectService.getById.mockResolvedValue({ id: projectId, ownerId, ...projectInput });
    runService.getById.mockResolvedValue({
      id: runId,
      projectId,
      chapterPlanId,
      type: 'CHAPTER_DRAFT',
      status: 'RUNNING',
      progress: 70,
      currentStep: 'Generating chapter draft',
      architecture: null,
      outline: null,
      chapterContent: null,
      factChanges: [],
      error: null,
      createdAt,
      updatedAt: createdAt,
    });
    runtimeClient.getJob.mockResolvedValue({
      id: runId,
      project: { id: projectId, ...projectInput },
      status: 'succeeded',
      progress: 100,
      currentStep: 'Generation complete',
      artifact: { chapterDraft: '林雾握紧信件。', factChanges: [aiProposal] },
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
    runService.update.mockResolvedValue({
      id: runId,
      projectId,
      chapterPlanId,
      type: 'CHAPTER_DRAFT',
      status: 'SUCCEEDED',
      progress: 100,
      currentStep: 'Generation complete',
      architecture: null,
      outline: null,
      chapterContent: '林雾握紧信件。',
      factChanges: [aiProposal],
      modelConfig: {},
      error: null,
      inputSummary: '',
      createdAt,
      updatedAt: createdAt,
    });
    chapterRevisionService.getById.mockResolvedValue(null);
    chapterPlanService.getById.mockResolvedValue({ id: chapterPlanId, chapterNumber: 1 });
    chapterRevisionService.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 1 });
    chapterRevisionService.create.mockResolvedValue({
      id: runId,
      projectId,
      chapterNumber: 1,
      chapterPlanId,
      runId,
    });
    chapterDraftPointerService.upsert.mockResolvedValue({
      id: '98cc0808-e3d3-4313-b276-3c6608168f0a',
    });
    factChangeService.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 1 });

    await service.getJob(ownerId, runId);

    expect(factChangeService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        revision: { connect: { id: runId } },
        source: 'ai',
        status: 'PROPOSED',
        subject: '林雾',
        evidence: '林雾握紧信件。',
        confidence: 0.9,
      }),
    );
  });

  it('keeps imported manuscript bytes in preview and creates finalized chapter pointers only after confirmation', async () => {
    const importId = '6b2b00c0-8ef8-4c66-8d36-6458712f45ab';
    const firstPlanId = '7e375753-9060-4720-a9fe-42512b7f6bfe';
    const secondPlanId = 'e3d6429a-0b2e-47a0-9adb-c35034b7b96f';
    const contentBase64 = Buffer.from(
      '第 1 章 雾港来信\n林雾是刑警。林雾收到一封旧信。\n\n第 2 章 潮声\n码头传来新的消息。',
      'utf8',
    ).toString('base64');
    projectImportService.create.mockResolvedValue({ id: importId, filename: '雾港来信.md' });

    const preview = await service.previewProjectImport(ownerId, {
      filename: '雾港来信.md',
      format: 'md',
      contentBase64,
    });
    expect(preview).toMatchObject({
      importId,
      sourceFormat: 'md',
      chapters: [
        { chapterNumber: 1, title: '第 1 章 雾港来信' },
        { chapterNumber: 2, title: '第 2 章 潮声' },
      ],
      factCandidates: [
        expect.objectContaining({
          chapterNumber: 1,
          subject: '林雾',
          predicate: 'description',
          value: '刑警',
        }),
      ],
    });
    const selectedCandidateId = preview.factCandidates[0]?.id;
    expect(selectedCandidateId).toBeDefined();
    expect(projectService.create).not.toHaveBeenCalled();
    expect(projectImportService.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId, sourceContentBase64: contentBase64 }),
    );

    projectImportService.getById.mockResolvedValue({
      id: importId,
      ownerId,
      filename: '雾港来信.md',
      sourceFormat: 'md',
      sourceContentBase64: contentBase64,
      contentHash: createHash('sha256').update(Buffer.from(contentBase64, 'base64')).digest('hex'),
      preview: projectImportService.create.mock.calls[0][0].preview,
      status: 'PREVIEWED',
    });
    projectService.create.mockResolvedValue({
      id: projectId,
      ownerId,
      title: '雾港来信',
      format: 'novel',
      genre: '悬疑',
      chapterCount: 2,
      targetWordsPerChapter: 3000,
    });
    blueprintService.create.mockResolvedValue({ id: 'ea9459d6-4b35-4918-b355-ef1a541b4f01' });
    chapterPlanService.create
      .mockResolvedValueOnce({ id: firstPlanId })
      .mockResolvedValueOnce({ id: secondPlanId });
    chapterRevisionService.create
      .mockResolvedValueOnce({ id: runId, projectId, chapterNumber: 1 })
      .mockResolvedValueOnce({
        id: 'b8bd77a3-7680-4598-8e29-bbbe8edbe955',
        projectId,
        chapterNumber: 2,
      });
    factService.create.mockResolvedValue({
      id: 'bc470edb-1095-4b76-9d6f-362332a9a5eb',
      factType: 'character',
      subject: '林雾',
      predicate: 'description',
      value: '刑警',
      effectiveChapter: 1,
      status: 'CONFIRMED',
      schemaVersion: 1,
    });
    chapterFinalizationService.create
      .mockResolvedValueOnce({ id: '6ca9a7c5-b2a6-4a91-b62c-3980a8faa910' })
      .mockResolvedValueOnce({ id: 'bbe7c937-a0b6-4f30-913b-fc4937bbaf88' });

    await expect(
      service.confirmProjectImport(ownerId, importId, {
        title: '雾港来信',
        genre: '悬疑',
        targetWordsPerChapter: 3000,
        acceptedFactCandidateIds: [selectedCandidateId!],
      }),
    ).resolves.toMatchObject({
      importId,
      importedChapterCount: 2,
      importedFactCount: 1,
      project: { id: projectId },
    });
    expect(chapterFinalizationService.create).toHaveBeenCalledTimes(2);
    expect(factService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: '林雾',
        predicate: 'description',
        value: '刑警',
        effectiveChapter: 1,
      }),
    );
    expect(finalizationFactSnapshotService.createMany).toHaveBeenCalledTimes(2);
    expect(projectImportService.update).toHaveBeenCalledWith(
      { id: importId },
      expect.objectContaining({ status: 'IMPORTED', project: { connect: { id: projectId } } }),
    );
  });
});
