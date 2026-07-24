import { StudioService } from './studio.service';

const ownerId = '0e3a7e4b-9bb5-4c8e-a1a3-7b6b0861c5ad';
const projectId = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1';
const runId = 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a';
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
  };
  const projectService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
  const runService = {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
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
    get: jest.fn(),
    upsert: jest.fn(),
  };
  const chapterFinalizationService = {
    create: jest.fn(),
    getByRevisionId: jest.fn(),
    update: jest.fn(),
  };
  const finalizationOutboxTaskService = {
    create: jest.fn(),
  };
  const factService = {
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
  const reviewFindingService = {
    count: jest.fn(),
    create: jest.fn(),
    getByFindingKey: jest.fn(),
  };
  const factChangeService = {
    count: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
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
    reviewFindingService.count.mockResolvedValue(0);
    service = new StudioService(
      runtimeClient as never,
      projectService as never,
      runService as never,
      blueprintService as never,
      chapterPlanService as never,
      chapterRevisionService as never,
      chapterDraftPointerService as never,
      chapterFinalPointerService as never,
      chapterFinalizationService as never,
      finalizationOutboxTaskService as never,
      factService as never,
      reviewFindingService as never,
      factChangeService as never,
      { execute: async <T>(callback: () => Promise<T>) => callback() } as never,
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
      { page: 1, limit: 20 },
      expect.objectContaining({ include: expect.any(Object) }),
    );
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
      { status: 'CONFIRMED' },
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
      status: 'FINALIZED',
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
    factChangeService.list.mockResolvedValue({ list: [pendingChange], total: 1, page: 1, limit: 500 });
    chapterFinalPointerService.get.mockResolvedValue(null);
    chapterRevisionService.update.mockResolvedValue({ ...revision, status: 'FINALIZED' });
    chapterFinalPointerService.upsert.mockResolvedValue({ revisionId: runId });
    chapterFinalizationService.create.mockResolvedValue(finalization);
    chapterFinalizationService.update.mockResolvedValue(finalization);
    factService.create.mockResolvedValue({ id: pendingChange.id });

    await expect(
      service.finalizeChapterRevision(ownerId, projectId, 1, runId),
    ).resolves.toMatchObject({ revisionId: runId, status: 'finalized', summaryStatus: 'pending' });
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
      { status: 'FINALIZED' },
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
});
