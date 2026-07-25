import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioWorkbench } from './studio-workbench';

const {
  confirmChapterPlan,
  confirmAdaptationBrief,
  compareChapterRevisions,
  createAdaptation,
  createAdaptationDecision,
  resolveAdaptationDecision,
  listAdaptationDecisions,
  listAdaptationSourceChapters,
  startScenePlanning,
  startScriptWriting,
  listScenePlans,
  saveScenePlan,
  confirmScenePlan,
  listSourceSceneMappings,
  createSourceSceneMapping,
  resolveSourceSceneMapping,
  createAuthorChapterRevision,
  createChapterDraft,
  createFactChange,
  createProject,
  finalizeChapterRevision,
  getBlueprint,
  getProjectOverview,
  getChapterPlan,
  listChapterRevisions,
  listAdaptations,
  listBlueprints,
  listFacts,
  listFactChanges,
  listChapterFinalizations,
  listReviewFindings,
  resolveFactChange,
  resolveReviewFinding,
  restoreChapterRevision,
  restoreBlueprint,
  restoreFinalChapterRevision,
  getJob,
  listFinalizationTasks,
  listProjects,
  retryFinalizationTask,
  retryJob,
  cancelJob,
  saveChapterPlan,
  updateAdaptationBrief,
  updateBlueprint,
} = vi.hoisted(() => ({
  confirmChapterPlan: vi.fn(),
  confirmAdaptationBrief: vi.fn(),
  compareChapterRevisions: vi.fn(),
  createAdaptation: vi.fn(),
  createAdaptationDecision: vi.fn(),
  resolveAdaptationDecision: vi.fn(),
  listAdaptationDecisions: vi.fn(),
  listAdaptationSourceChapters: vi.fn(),
  startScenePlanning: vi.fn(),
  startScriptWriting: vi.fn(),
  listScenePlans: vi.fn(),
  saveScenePlan: vi.fn(),
  confirmScenePlan: vi.fn(),
  listSourceSceneMappings: vi.fn(),
  createSourceSceneMapping: vi.fn(),
  resolveSourceSceneMapping: vi.fn(),
  createAuthorChapterRevision: vi.fn(),
  createChapterDraft: vi.fn(),
  createFactChange: vi.fn(),
  createProject: vi.fn(),
  finalizeChapterRevision: vi.fn(),
  getBlueprint: vi.fn(),
  getProjectOverview: vi.fn(),
  getChapterPlan: vi.fn(),
  listChapterRevisions: vi.fn(),
  listAdaptations: vi.fn(),
  listBlueprints: vi.fn(),
  listFacts: vi.fn(),
  listFactChanges: vi.fn(),
  listChapterFinalizations: vi.fn(),
  listReviewFindings: vi.fn(),
  resolveFactChange: vi.fn(),
  resolveReviewFinding: vi.fn(),
  restoreChapterRevision: vi.fn(),
  restoreBlueprint: vi.fn(),
  restoreFinalChapterRevision: vi.fn(),
  getJob: vi.fn(),
  listFinalizationTasks: vi.fn(),
  listProjects: vi.fn(),
  retryFinalizationTask: vi.fn(),
  retryJob: vi.fn(),
  cancelJob: vi.fn(),
  saveChapterPlan: vi.fn(),
  updateAdaptationBrief: vi.fn(),
  updateBlueprint: vi.fn(),
}));

vi.mock('@/lib/api/contracts/client', () => ({
  studioClient: {
    listProjects,
    listAdaptations,
    createProject,
    createAdaptation,
    updateAdaptationBrief,
    confirmAdaptationBrief,
    listAdaptationDecisions,
    listAdaptationSourceChapters,
    createAdaptationDecision,
    resolveAdaptationDecision,
    startScenePlanning,
    startScriptWriting,
    listScenePlans,
    saveScenePlan,
    confirmScenePlan,
    listSourceSceneMappings,
    createSourceSceneMapping,
    resolveSourceSceneMapping,
    getBlueprint,
    getProjectOverview,
    getJob,
    updateBlueprint,
    confirmBlueprint: vi.fn(),
    getChapterPlan,
    listChapterRevisions,
    listBlueprints,
    listFacts,
    listFactChanges,
    listChapterFinalizations,
    listReviewFindings,
    createFactChange,
    finalizeChapterRevision,
    resolveFactChange,
    resolveReviewFinding,
    restoreChapterRevision,
    restoreBlueprint,
    restoreFinalChapterRevision,
    saveChapterPlan,
    confirmChapterPlan,
    compareChapterRevisions,
    createAuthorChapterRevision,
    createChapterDraft,
    listFinalizationTasks,
    retryFinalizationTask,
    retryJob,
    cancelJob,
    exportProject: vi.fn(),
  },
}));

vi.mock('@repo/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  Progress: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  SelectValue: () => null,
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

function setStoryPremise(value: string) {
  const editor = screen.getByLabelText('故事梗概');
  editor.textContent = value;
  fireEvent.input(editor);
}

describe('StudioWorkbench', () => {
  beforeEach(() => {
    listProjects.mockReset();
    listAdaptations.mockReset();
    createProject.mockReset();
    createAdaptation.mockReset();
    updateAdaptationBrief.mockReset();
    confirmAdaptationBrief.mockReset();
    listAdaptationDecisions.mockReset();
    listAdaptationSourceChapters.mockReset();
    createAdaptationDecision.mockReset();
    resolveAdaptationDecision.mockReset();
    startScenePlanning.mockReset();
    startScriptWriting.mockReset();
    listScenePlans.mockReset();
    saveScenePlan.mockReset();
    confirmScenePlan.mockReset();
    listSourceSceneMappings.mockReset();
    createSourceSceneMapping.mockReset();
    resolveSourceSceneMapping.mockReset();
    createAuthorChapterRevision.mockReset();
    finalizeChapterRevision.mockReset();
    getBlueprint.mockReset();
    getProjectOverview.mockReset();
    getJob.mockReset();
    listFinalizationTasks.mockReset();
    retryFinalizationTask.mockReset();
    retryJob.mockReset();
    cancelJob.mockReset();
    getChapterPlan.mockReset();
    listChapterRevisions.mockReset();
    listBlueprints.mockReset();
    listFacts.mockReset();
    listFactChanges.mockReset();
    listChapterFinalizations.mockReset();
    listReviewFindings.mockReset();
    createFactChange.mockReset();
    resolveFactChange.mockReset();
    resolveReviewFinding.mockReset();
    restoreChapterRevision.mockReset();
    restoreBlueprint.mockReset();
    restoreFinalChapterRevision.mockReset();
    saveChapterPlan.mockReset();
    confirmChapterPlan.mockReset();
    compareChapterRevisions.mockReset();
    createChapterDraft.mockReset();
    updateBlueprint.mockReset();
    getProjectOverview.mockResolvedValue({
      status: 200,
      body: {
        data: {
          projectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
          finalizedChapterCount: 0,
          pendingChapterReviewNumbers: [],
          pendingFactChangeCount: 0,
          confirmedFactCount: 0,
          blockingFindingCount: 0,
          pendingFinalizationTaskCount: 0,
          failedFinalizationTaskCount: 0,
        },
      },
    });
    listFinalizationTasks.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 20 } },
    });
    listAdaptations.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 20 } },
    });
    updateAdaptationBrief.mockResolvedValue({ status: 500 });
    confirmAdaptationBrief.mockResolvedValue({ status: 500 });
    listAdaptationDecisions.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 50 } },
    });
    listAdaptationSourceChapters.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 100 } },
    });
    createAdaptationDecision.mockResolvedValue({ status: 500 });
    resolveAdaptationDecision.mockResolvedValue({ status: 500 });
    startScenePlanning.mockResolvedValue({ status: 500 });
    startScriptWriting.mockResolvedValue({ status: 500 });
    listScenePlans.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 100 } },
    });
    saveScenePlan.mockResolvedValue({ status: 500 });
    confirmScenePlan.mockResolvedValue({ status: 500 });
    listSourceSceneMappings.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 100 } },
    });
    createSourceSceneMapping.mockResolvedValue({ status: 500 });
    resolveSourceSceneMapping.mockResolvedValue({ status: 500 });
    getChapterPlan.mockResolvedValue({ status: 404 });
    listChapterRevisions.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 20 } },
    });
    listBlueprints.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 50 } },
    });
    listFactChanges.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 50 } },
    });
    listChapterFinalizations.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 50 } },
    });
    listReviewFindings.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 50 } },
    });
    listFacts.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 100 } },
    });
    compareChapterRevisions.mockResolvedValue({
      status: 200,
      body: {
        data: {
          baseRevisionId: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
          comparisonRevisionId: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
          segments: [],
        },
      },
    });
    listProjects.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [
            {
              id: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
              title: '雾港来信',
              format: 'novel',
              genre: '悬疑',
              chapterCount: 20,
              targetWordsPerChapter: 3000,
              createdAt: '2026-07-24T02:00:00.000Z',
              updatedAt: '2026-07-24T02:00:00.000Z',
              finalizedChapterCount: 1,
              confirmedFactCount: 2,
              blockingFindingCount: 0,
              latestRun: {
                id: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
                status: 'running',
                progress: 55,
                currentStep: 'Generating story architecture',
                updatedAt: '2026-07-24T02:00:00.000Z',
              },
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
    });
  });

  it('loads the current author project library and shows its latest run state', async () => {
    render(<StudioWorkbench />);

    expect(await screen.findByText('雾港来信')).toBeInTheDocument();
    expect(screen.getByText('生成中')).toBeInTheDocument();
    expect(screen.getByText('Generating story architecture')).toBeInTheDocument();
    await waitFor(() => {
      expect(listProjects).toHaveBeenCalledWith({
        query: { page: 1, limit: 20 },
      });
    });
  });

  it('asks for a project name before revealing the detailed story form', async () => {
    render(<StudioWorkbench />);

    expect(screen.getByRole('heading', { name: '从一个项目开始' })).toBeInTheDocument();
    expect(screen.queryByLabelText('故事梗概')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));
    expect(await screen.findByText('请先为项目命名。')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: '雾港来信' } });
    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));

    expect(await screen.findByLabelText('故事梗概')).toBeInTheDocument();
    expect(screen.getByText('当前项目')).toBeInTheDocument();
  });

  it('refreshes the project library when creation dispatch fails after persistence', async () => {
    createProject.mockRejectedValue(new Error('runtime unavailable'));

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: '雾港来信' } });
    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));
    setStoryPremise('一封迟到二十年的信件，让雾港的失踪案重新浮出水面。');
    fireEvent.click(screen.getByRole('button', { name: '生成故事架构' }));

    expect(
      await screen.findByText('创建请求未完成。请先在作品库确认是否已有该作品。'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(listProjects).toHaveBeenCalledTimes(2);
    });
  });

  it('refreshes the project library when creation returns a non-queue response', async () => {
    createProject.mockResolvedValue({ status: 500 });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: '雾港来信' } });
    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));
    setStoryPremise('一封迟到二十年的信件，让雾港的失踪案重新浮出水面。');
    fireEvent.click(screen.getByRole('button', { name: '生成故事架构' }));

    expect(
      await screen.findByText('项目没有成功进入生成队列。请在作品库确认项目状态。'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(listProjects).toHaveBeenCalledTimes(2);
    });
  });

  it('refreshes the project library after cancelling an active generation', async () => {
    const activeJob = {
      id: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
      project: {
        id: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
        title: '雾港来信',
        format: 'novel' as const,
        genre: '悬疑',
        chapterCount: 20,
        targetWordsPerChapter: 3000,
      },
      status: 'running' as const,
      progress: 55,
      currentStep: 'Generating story architecture',
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    getBlueprint.mockResolvedValue({ status: 404 });
    getJob.mockResolvedValue({ status: 200, body: { data: activeJob } });
    cancelJob.mockResolvedValue({
      status: 202,
      body: { data: { ...activeJob, status: 'cancelled', currentStep: 'Cancellation requested' } },
    });

    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: '打开作品' }));
    fireEvent.click(await screen.findByRole('button', { name: '取消生成' }));

    await waitFor(() => {
      expect(cancelJob).toHaveBeenCalledWith({ params: { jobId: activeJob.id }, body: {} });
      expect(listProjects).toHaveBeenCalledTimes(2);
    });
  });

  it('loads the next project-library page without replacing already opened works', async () => {
    const firstProject = {
      id: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
      title: '雾港来信',
      format: 'novel' as const,
      genre: '悬疑',
      chapterCount: 20,
      targetWordsPerChapter: 3000,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
      finalizedChapterCount: 1,
      confirmedFactCount: 2,
      blockingFindingCount: 0,
      latestRun: undefined,
    };
    const secondProject = {
      ...firstProject,
      id: 'fa46e9a4-574a-4d55-bb21-1d89a5f3acd1',
      title: '雨巷手记',
    };
    listProjects.mockResolvedValueOnce({
      status: 200,
      body: { data: { list: [firstProject], total: 21, page: 1, limit: 20 } },
    });
    listProjects.mockResolvedValueOnce({
      status: 200,
      body: { data: { list: [secondProject], total: 21, page: 2, limit: 20 } },
    });

    render(<StudioWorkbench />);

    expect(await screen.findByText('雾港来信')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '加载更多作品' }));

    expect(await screen.findByText('雨巷手记')).toBeInTheDocument();
    expect(screen.getByText('雾港来信')).toBeInTheDocument();
    expect(listProjects).toHaveBeenLastCalledWith({ query: { page: 2, limit: 20 } });
  });

  it('explains the saved state and recovery action for a recoverable finalization task', async () => {
    listProjects.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [
            {
              id: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
              title: '雾港来信',
              format: 'novel',
              genre: '悬疑',
              chapterCount: 20,
              targetWordsPerChapter: 3000,
              createdAt: '2026-07-24T02:00:00.000Z',
              updatedAt: '2026-07-24T02:00:00.000Z',
              finalizedChapterCount: 1,
              confirmedFactCount: 2,
              blockingFindingCount: 0,
              latestRun: undefined,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
    });
    getBlueprint.mockResolvedValue({ status: 404 });
    listFinalizationTasks.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [
            {
              id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
              projectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
              revisionId: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
              chapterNumber: 1,
              type: 'index',
              status: 'recoverable',
              attemptCount: 2,
              lastError: '索引服务暂时不可用',
              createdAt: '2026-07-24T02:00:00.000Z',
              updatedAt: '2026-07-24T02:00:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
    });

    render(<StudioWorkbench />);

    fireEvent.click(await screen.findByRole('button', { name: '继续创作' }, { timeout: 5_000 }));

    expect(await screen.findByText('正文和事实裁决已保存；索引尚未完成。')).toBeInTheDocument();
    expect(screen.getByText('最近错误：索引服务暂时不可用')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  it('opens an imported project without a generation run after the library reloads', async () => {
    listProjects.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [
            {
              id: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
              title: '导入的雾港来信',
              format: 'novel',
              genre: '悬疑',
              chapterCount: 20,
              targetWordsPerChapter: 3000,
              createdAt: '2026-07-24T02:00:00.000Z',
              updatedAt: '2026-07-24T02:00:00.000Z',
              finalizedChapterCount: 20,
              confirmedFactCount: 2,
              blockingFindingCount: 0,
              latestRun: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
    });
    getBlueprint.mockResolvedValue({ status: 404 });

    render(<StudioWorkbench />);

    fireEvent.click(await screen.findByRole('button', { name: '继续创作' }, { timeout: 5_000 }));

    await waitFor(() => {
      expect(getProjectOverview).toHaveBeenCalledWith({
        params: { projectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1' },
      });
    });
    expect(getJob).not.toHaveBeenCalled();
  });

  it('creates a screenplay adaptation from finalized novel chapters after rights confirmation', async () => {
    getProjectOverview.mockResolvedValue({
      status: 200,
      body: {
        data: {
          projectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
          finalizedChapterCount: 1,
          pendingChapterReviewNumbers: [],
          pendingFactChangeCount: 0,
          confirmedFactCount: 0,
          blockingFindingCount: 0,
          pendingFinalizationTaskCount: 0,
          failedFinalizationTaskCount: 0,
        },
      },
    });
    getBlueprint.mockResolvedValue({ status: 404 });
    createAdaptation.mockResolvedValue({
      status: 201,
      body: {
        data: {
          id: '723b82cf-cfa4-4ddc-b11a-bc89f42f73a7',
          sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
          targetFormat: 'series',
          episodeCount: 12,
          minutesPerEpisode: 45,
          targetAudience: '',
          adaptationGoal: '',
          mustPreserve: '',
          status: 'brief_draft',
          sourceSnapshot: {
            id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
            sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
            sourceProjectTitle: '雾港来信',
            sourceProjectUpdatedAt: '2026-07-24T02:00:00.000Z',
            sourceChapterCount: 1,
            createdAt: '2026-07-24T02:00:00.000Z',
          },
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: '打开作品' }));
    expect(await screen.findByRole('heading', { name: '小说转剧本' })).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole('checkbox', {
        name: '我确认拥有该小说用于本次改编创作的必要权利。',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '创建改编项目' }));

    await waitFor(() => {
      expect(createAdaptation).toHaveBeenCalledWith({
        params: { projectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1' },
        body: expect.objectContaining({ rightsConfirmed: true, targetFormat: 'series' }),
      });
    });
    expect(await screen.findByText('剧集改编')).toBeInTheDocument();
  });

  it('saves and confirms an adaptation brief before the next blueprint stage', async () => {
    const draftAdaptation = {
      id: '723b82cf-cfa4-4ddc-b11a-bc89f42f73a7',
      sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
      targetFormat: 'series' as const,
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '',
      adaptationGoal: '',
      mustPreserve: '',
      status: 'brief_draft' as const,
      sourceSnapshot: {
        id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
        sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
        sourceProjectTitle: '雾港来信',
        sourceProjectUpdatedAt: '2026-07-24T02:00:00.000Z',
        sourceChapterCount: 1,
        createdAt: '2026-07-24T02:00:00.000Z',
      },
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    getProjectOverview.mockResolvedValue({
      status: 200,
      body: {
        data: {
          projectId: draftAdaptation.sourceProjectId,
          finalizedChapterCount: 1,
          pendingChapterReviewNumbers: [],
          pendingFactChangeCount: 0,
          confirmedFactCount: 0,
          blockingFindingCount: 0,
          pendingFinalizationTaskCount: 0,
          failedFinalizationTaskCount: 0,
        },
      },
    });
    getBlueprint.mockResolvedValue({ status: 404 });
    listAdaptations.mockResolvedValue({
      status: 200,
      body: { data: { list: [draftAdaptation], total: 1, page: 1, limit: 20 } },
    });
    const completedBrief = {
      ...draftAdaptation,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线，同时强化女主与父亲的冲突。',
      mustPreserve: '保留雾港秘密与终局反转。',
    };
    updateAdaptationBrief.mockResolvedValue({ status: 200, body: { data: completedBrief } });
    confirmAdaptationBrief.mockResolvedValue({
      status: 200,
      body: { data: { ...completedBrief, status: 'blueprint_review' } },
    });

    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: '打开作品' }));
    fireEvent.click(await screen.findByRole('button', { name: '编辑简报' }));
    fireEvent.change(screen.getByLabelText('目标观众'), {
      target: { value: completedBrief.targetAudience },
    });
    fireEvent.change(screen.getByLabelText('改编目标'), {
      target: { value: completedBrief.adaptationGoal },
    });
    fireEvent.change(screen.getByLabelText('必须保留'), {
      target: { value: completedBrief.mustPreserve },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存简报' }));

    await waitFor(() => {
      expect(updateAdaptationBrief).toHaveBeenCalledWith({
        params: { adaptationId: draftAdaptation.id },
        body: expect.objectContaining({ targetAudience: '悬疑剧观众' }),
      });
    });
    fireEvent.click(await screen.findByRole('button', { name: '确认简报并进入蓝图审阅' }));
    await waitFor(() => {
      expect(confirmAdaptationBrief).toHaveBeenCalledWith({
        params: { adaptationId: draftAdaptation.id },
        body: {},
      });
    });
    expect(await screen.findByText('待蓝图审阅')).toBeInTheDocument();
  });

  it('records and resolves source-anchored adaptation decisions during blueprint review', async () => {
    const adaptationId = '723b82cf-cfa4-4ddc-b11a-bc89f42f73a7';
    const sourceChapterId = 'c2fe573d-e9e0-423e-9319-4f6fc375e75d';
    const decisionId = '44bc6378-7f2d-43a8-8ee3-9ed5d72c19d8';
    const draftAdaptation = {
      id: adaptationId,
      sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
      targetFormat: 'series' as const,
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线，同时强化女主与父亲的冲突。',
      mustPreserve: '保留雾港秘密与终局反转。',
      status: 'brief_draft' as const,
      sourceSnapshot: {
        id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
        sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
        sourceProjectTitle: '雾港来信',
        sourceProjectUpdatedAt: '2026-07-24T02:00:00.000Z',
        sourceChapterCount: 1,
        createdAt: '2026-07-24T02:00:00.000Z',
      },
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    getProjectOverview.mockResolvedValue({
      status: 200,
      body: {
        data: {
          projectId: draftAdaptation.sourceProjectId,
          finalizedChapterCount: 1,
          pendingChapterReviewNumbers: [],
          pendingFactChangeCount: 0,
          confirmedFactCount: 0,
          blockingFindingCount: 0,
          pendingFinalizationTaskCount: 0,
          failedFinalizationTaskCount: 0,
        },
      },
    });
    getBlueprint.mockResolvedValue({ status: 404 });
    listAdaptations.mockResolvedValue({
      status: 200,
      body: { data: { list: [draftAdaptation], total: 1, page: 1, limit: 20 } },
    });
    listAdaptationSourceChapters.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [
            {
              id: sourceChapterId,
              snapshotId: draftAdaptation.sourceSnapshot.id,
              sourceRevisionId: '8a1f5e2c-7b3a-4d9e-b6c1-2f4a8d9e0b3a',
              chapterNumber: 1,
              title: '迟到的信件',
              content: '雨声先于信件抵达。',
              contentHash: 'a'.repeat(64),
              wordCount: 8,
              createdAt: '2026-07-24T02:00:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
        },
      },
    });
    const proposedDecision = {
      id: decisionId,
      adaptationId,
      sourceSnapshotId: draftAdaptation.sourceSnapshot.id,
      sourceChapter: { id: sourceChapterId, chapterNumber: 1, title: '迟到的信件' },
      type: 'merge' as const,
      impact: 'high' as const,
      proposal: '合并第 1、2 章两位配角的同一线索。',
      rationale: '减少重复信息，强化主线悬念。',
      status: 'proposed' as const,
      resolutionReason: null,
      resolvedAt: null,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    listAdaptationDecisions.mockResolvedValue({
      status: 200,
      body: { data: { list: [proposedDecision], total: 1, page: 1, limit: 50 } },
    });
    confirmAdaptationBrief.mockResolvedValue({
      status: 200,
      body: { data: { ...draftAdaptation, status: 'blueprint_review' } },
    });
    resolveAdaptationDecision.mockResolvedValue({
      status: 200,
      body: {
        data: {
          ...proposedDecision,
          status: 'accepted',
          resolutionReason: '保留合并后的关键情绪转折。',
          resolvedAt: '2026-07-25T08:00:00.000Z',
          updatedAt: '2026-07-25T08:00:00.000Z',
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: '打开作品' }));
    fireEvent.click(await screen.findByRole('button', { name: '编辑简报' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认简报并进入蓝图审阅' }));

    await waitFor(() => {
      expect(confirmAdaptationBrief).toHaveBeenCalledWith({
        params: { adaptationId },
        body: {},
      });
    });
    await screen.findByText('改编取舍');
    await waitFor(() => {
      expect(listAdaptationDecisions).toHaveBeenCalledWith({
        params: { adaptationId },
        query: { page: 1, limit: 50 },
      });
      expect(listAdaptationSourceChapters).toHaveBeenCalledWith({
        params: { adaptationId },
        query: { page: 1, limit: 100 },
      });
    });

    fireEvent.change(screen.getByLabelText(`取舍处理理由 ${decisionId}`), {
      target: { value: '保留合并后的关键情绪转折。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '接受' }));

    await waitFor(() => {
      expect(resolveAdaptationDecision).toHaveBeenCalledWith({
        params: { adaptationId, decisionId },
        body: {
          outcome: 'accepted',
          resolutionReason: '保留合并后的关键情绪转折。',
        },
      });
    });
    expect(await screen.findByText('已接受')).toBeInTheDocument();
  });

  it('advances into scene planning and confirms a per-episode plan', async () => {
    const adaptationId = '723b82cf-cfa4-4ddc-b11a-bc89f42f73a7';
    const blueprintAdaptation = {
      id: adaptationId,
      sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
      targetFormat: 'series' as const,
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线。',
      mustPreserve: '保留雾港秘密。',
      status: 'blueprint_review' as const,
      sourceSnapshot: {
        id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
        sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
        sourceProjectTitle: '雾港来信',
        sourceProjectUpdatedAt: '2026-07-24T02:00:00.000Z',
        sourceChapterCount: 2,
        createdAt: '2026-07-24T02:00:00.000Z',
      },
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    listAdaptations.mockResolvedValue({
      status: 200,
      body: { data: { list: [blueprintAdaptation], total: 1, page: 1, limit: 20 } },
    });
    startScenePlanning.mockResolvedValue({
      status: 200,
      body: { data: { ...blueprintAdaptation, status: 'scene_planning' } },
    });
    const savedPlan = {
      id: '6a4c2e8d-9b1f-4c3a-8d2e-1b5f6a7c8d9e',
      adaptationId,
      episodeNumber: 1,
      title: '雾港重逢',
      synopsis: '女主回到雾港码头。',
      sceneOutline: [],
      needsReview: false,
      confirmedAt: null,
      createdAt: '2026-07-25T02:00:00.000Z',
      updatedAt: '2026-07-25T02:00:00.000Z',
    };
    saveScenePlan.mockResolvedValue({ status: 200, body: { data: savedPlan } });
    confirmScenePlan.mockResolvedValue({
      status: 200,
      body: { data: { ...savedPlan, confirmedAt: '2026-07-25T03:00:00.000Z' } },
    });

    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: '打开作品' }));
    fireEvent.click(await screen.findByRole('button', { name: '查看简报' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入场景计划' }));

    await waitFor(() => {
      expect(startScenePlanning).toHaveBeenCalledWith({
        params: { adaptationId },
        body: {},
      });
    });
    await screen.findByText('场景计划');

    fireEvent.change(screen.getByLabelText('本集标题'), { target: { value: '雾港重逢' } });
    fireEvent.change(screen.getByLabelText('本集梗概'), {
      target: { value: '女主回到雾港码头。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存本集计划' }));

    await waitFor(() => {
      expect(saveScenePlan).toHaveBeenCalledWith({
        params: { adaptationId, episodeNumber: 1 },
        body: { title: '雾港重逢', synopsis: '女主回到雾港码头。', sceneOutline: [] },
      });
    });
    fireEvent.click(await screen.findByRole('button', { name: '确认本集计划' }));

    await waitFor(() => {
      expect(confirmScenePlan).toHaveBeenCalledWith({
        params: { adaptationId, episodeNumber: 1 },
        body: {},
      });
    });
    expect(await screen.findByText('已确认')).toBeInTheDocument();
  });

  it('saves a structured scene outline with anchored scenes per episode', async () => {
    const adaptationId = '723b82cf-cfa4-4ddc-b11a-bc89f42f73a7';
    const blueprintAdaptation = {
      id: adaptationId,
      sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
      targetFormat: 'series' as const,
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线。',
      mustPreserve: '保留雾港秘密。',
      status: 'blueprint_review' as const,
      sourceSnapshot: {
        id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
        sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
        sourceProjectTitle: '雾港来信',
        sourceProjectUpdatedAt: '2026-07-24T02:00:00.000Z',
        sourceChapterCount: 2,
        createdAt: '2026-07-24T02:00:00.000Z',
      },
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    listAdaptations.mockResolvedValue({
      status: 200,
      body: { data: { list: [blueprintAdaptation], total: 1, page: 1, limit: 20 } },
    });
    startScenePlanning.mockResolvedValue({
      status: 200,
      body: { data: { ...blueprintAdaptation, status: 'scene_planning' } },
    });
    const savedPlan = {
      id: '6a4c2e8d-9b1f-4c3a-8d2e-1b5f6a7c8d9e',
      adaptationId,
      episodeNumber: 1,
      title: '雾港重逢',
      synopsis: '女主回到雾港码头。',
      sceneOutline: [
        {
          sceneNumber: 1,
          title: '码头重逢',
          synopsis: '女主与旧识在码头相遇。',
          act: 'setup',
          sourceChapterIds: [],
        },
      ],
      needsReview: false,
      confirmedAt: null,
      createdAt: '2026-07-25T02:00:00.000Z',
      updatedAt: '2026-07-25T02:00:00.000Z',
    };
    saveScenePlan.mockResolvedValue({ status: 200, body: { data: savedPlan } });

    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: '打开作品' }));
    fireEvent.click(await screen.findByRole('button', { name: '查看简报' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入场景计划' }));
    await screen.findByText('场景计划');

    fireEvent.change(screen.getByLabelText('本集标题'), { target: { value: '雾港重逢' } });
    fireEvent.change(screen.getByLabelText('本集梗概'), {
      target: { value: '女主回到雾港码头。' },
    });
    fireEvent.change(screen.getByLabelText('新场景标题'), { target: { value: '码头重逢' } });
    fireEvent.change(screen.getByLabelText('新场景梗概'), {
      target: { value: '女主与旧识在码头相遇。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加场景' }));
    fireEvent.click(screen.getByRole('button', { name: '保存本集计划' }));

    await waitFor(() => {
      expect(saveScenePlan).toHaveBeenCalledWith({
        params: { adaptationId, episodeNumber: 1 },
        body: expect.objectContaining({
          title: '雾港重逢',
          sceneOutline: [
            expect.objectContaining({
              sceneNumber: 1,
              title: '码头重逢',
              synopsis: '女主与旧识在码头相遇。',
            }),
          ],
        }),
      });
    });
  });

  it('lists and confirms source-scene traceability mappings', async () => {
    const adaptationId = '723b82cf-cfa4-4ddc-b11a-bc89f42f73a7';
    const sourceChapterId = 'c2fe573d-e9e0-423e-9319-4f6fc375e75d';
    const mappingId = '5e4d3c2b-1a0f-9e8d-7c6b-5a4f3e2d1c0b';
    const scenePlanningAdaptation = {
      id: adaptationId,
      sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
      targetFormat: 'series' as const,
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线。',
      mustPreserve: '保留雾港秘密。',
      status: 'scene_planning' as const,
      sourceSnapshot: {
        id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
        sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
        sourceProjectTitle: '雾港来信',
        sourceProjectUpdatedAt: '2026-07-24T02:00:00.000Z',
        sourceChapterCount: 2,
        createdAt: '2026-07-24T02:00:00.000Z',
      },
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    listAdaptations.mockResolvedValue({
      status: 200,
      body: { data: { list: [scenePlanningAdaptation], total: 1, page: 1, limit: 20 } },
    });
    listAdaptationSourceChapters.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [
            {
              id: sourceChapterId,
              snapshotId: scenePlanningAdaptation.sourceSnapshot.id,
              sourceRevisionId: '8a1f5e2c-7b3a-4d9e-b6c1-2f4a8d9e0b3a',
              chapterNumber: 1,
              title: '迟到的信件',
              content: '雨声先于信件抵达。',
              contentHash: 'a'.repeat(64),
              wordCount: 8,
              createdAt: '2026-07-24T02:00:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
        },
      },
    });
    const proposedMapping = {
      id: mappingId,
      adaptationId,
      scenePlanId: 'ab1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
      episodeNumber: 1,
      sceneNumber: 1,
      sourceChapter: { id: sourceChapterId, chapterNumber: 1, title: '迟到的信件' },
      evidenceAnchor: '第 1 章开场段落。',
      status: 'proposed' as const,
      createdAt: '2026-07-25T02:00:00.000Z',
      updatedAt: '2026-07-25T02:00:00.000Z',
    };
    listSourceSceneMappings.mockResolvedValue({
      status: 200,
      body: { data: { list: [proposedMapping], total: 1, page: 1, limit: 100 } },
    });
    resolveSourceSceneMapping.mockResolvedValue({
      status: 200,
      body: { data: { ...proposedMapping, status: 'confirmed' } },
    });

    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: '打开作品' }));
    fireEvent.click(await screen.findByRole('button', { name: '查看简报' }));
    await screen.findByText('场景溯源');

    fireEvent.change(screen.getByLabelText(`溯源处理理由 ${mappingId}`), {
      target: { value: '场景与来源开场一致。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确认溯源' }));

    await waitFor(() => {
      expect(resolveSourceSceneMapping).toHaveBeenCalledWith({
        params: { adaptationId, mappingId },
        body: { status: 'confirmed', reason: '场景与来源开场一致。' },
      });
    });
    expect(await screen.findByText('已确认')).toBeInTheDocument();
  });

  it('advances from scene planning into script writing', async () => {
    const adaptationId = '723b82cf-cfa4-4ddc-b11a-bc89f42f73a7';
    const scenePlanningAdaptation = {
      id: adaptationId,
      sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
      targetFormat: 'series' as const,
      episodeCount: 12,
      minutesPerEpisode: 45,
      targetAudience: '悬疑剧观众',
      adaptationGoal: '保留原作悬疑主线。',
      mustPreserve: '保留雾港秘密。',
      status: 'scene_planning' as const,
      sourceSnapshot: {
        id: 'f3d24d48-5b32-4ba1-8d10-978eb8e4f817',
        sourceProjectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
        sourceProjectTitle: '雾港来信',
        sourceProjectUpdatedAt: '2026-07-24T02:00:00.000Z',
        sourceChapterCount: 2,
        createdAt: '2026-07-24T02:00:00.000Z',
      },
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    listAdaptations.mockResolvedValue({
      status: 200,
      body: { data: { list: [scenePlanningAdaptation], total: 1, page: 1, limit: 20 } },
    });
    startScriptWriting.mockResolvedValue({
      status: 200,
      body: { data: { ...scenePlanningAdaptation, status: 'script_writing' } },
    });

    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: '打开作品' }));
    fireEvent.click(await screen.findByRole('button', { name: '查看简报' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入剧本生成' }));

    await waitFor(() => {
      expect(startScriptWriting).toHaveBeenCalledWith({
        params: { adaptationId },
        body: {},
      });
    });
  });

  it('offers recovery for a failed generation after opening the project', async () => {
    const failedRun = {
      id: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
      project: {
        id: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
        title: '雾港来信',
        format: 'novel' as const,
        genre: '悬疑',
        chapterCount: 20,
        targetWordsPerChapter: 3000,
      },
      status: 'failed' as const,
      progress: 100,
      currentStep: 'Generation failed',
      error: '运行时暂时不可用',
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    getJob.mockResolvedValue({ status: 200, body: { data: failedRun } });
    retryJob.mockResolvedValue({
      status: 202,
      body: {
        data: { ...failedRun, status: 'queued', progress: 0, currentStep: 'Queued for recovery' },
      },
    });
    getBlueprint.mockResolvedValue({ status: 404 });
    listProjects.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [
            {
              id: failedRun.project.id,
              title: failedRun.project.title,
              format: 'novel',
              genre: '悬疑',
              chapterCount: 20,
              targetWordsPerChapter: 3000,
              createdAt: failedRun.createdAt,
              updatedAt: failedRun.updatedAt,
              finalizedChapterCount: 0,
              confirmedFactCount: 0,
              blockingFindingCount: 0,
              latestRun: failedRun,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByRole('button', { name: '打开作品' }));
    expect(await screen.findByText('最近错误：运行时暂时不可用')).toBeInTheDocument();
    expect(screen.getByLabelText('当前任务进度')).toHaveAttribute('value', '100');
    fireEvent.click(await screen.findByRole('button', { name: '重新开始生成' }));

    await waitFor(() => {
      expect(retryJob).toHaveBeenCalledWith({ params: { jobId: failedRun.id }, body: {} });
    });
    expect(await screen.findByText('Queued for recovery')).toBeInTheDocument();
    await waitFor(() => {
      expect(listProjects).toHaveBeenCalledTimes(2);
    });
  });

  it('loads the editable blueprint after a generation job succeeds', async () => {
    const projectId = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1';
    createProject.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
          project: {
            id: projectId,
            title: '雾港来信',
            format: 'novel',
            genre: '悬疑',
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: 'succeeded',
          progress: 100,
          currentStep: 'Generation complete',
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });
    getBlueprint.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
          projectId,
          version: 1,
          status: 'draft',
          architecture: '雾港的秘密由一封迟到的信件揭开。',
          outline: '第 1 章：信件抵达',
          source: 'ai',
          schemaVersion: 1,
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '雾港来信' },
    });
    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));
    setStoryPremise('一封迟到二十年的信件，让雾港的失踪案重新浮出水面。');
    fireEvent.click(screen.getByRole('button', { name: '生成故事架构' }));

    expect(await screen.findByText('创作蓝图')).toBeInTheDocument();
    expect(screen.getByDisplayValue('雾港的秘密由一封迟到的信件揭开。')).toBeInTheDocument();
    expect(getBlueprint).toHaveBeenCalledWith({ params: { projectId } });
  });

  it('creates a new draft when an author edits a confirmed blueprint', async () => {
    const projectId = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1';
    createProject.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
          project: {
            id: projectId,
            title: '雾港来信',
            format: 'novel',
            genre: '悬疑',
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: 'succeeded',
          progress: 100,
          currentStep: 'Generation complete',
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });
    getBlueprint.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
          projectId,
          version: 1,
          status: 'confirmed',
          architecture: '初始架构',
          outline: '初始目录',
          source: 'ai',
          schemaVersion: 1,
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });
    updateBlueprint.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
          projectId,
          version: 2,
          status: 'draft',
          architecture: '修订后的架构',
          outline: '初始目录',
          source: 'author',
          schemaVersion: 1,
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '雾港来信' },
    });
    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));
    setStoryPremise('一封迟到二十年的信件，让雾港的失踪案重新浮出水面。');
    fireEvent.click(screen.getByRole('button', { name: '生成故事架构' }));

    expect(await screen.findByRole('button', { name: '创建修订版' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '创建修订版' }));
    fireEvent.change(screen.getByLabelText('故事架构'), {
      target: { value: '修订后的架构' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存蓝图' }));

    await waitFor(() => {
      expect(updateBlueprint).toHaveBeenCalledWith({
        params: { projectId },
        body: { architecture: '修订后的架构', outline: '初始目录' },
      });
    });
    expect(await screen.findByText('版本 2')).toBeInTheDocument();
  });

  it('saves a structured first chapter plan after the blueprint is confirmed', async () => {
    const projectId = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1';
    createProject.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
          project: {
            id: projectId,
            title: '雾港来信',
            format: 'novel',
            genre: '悬疑',
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: 'succeeded',
          progress: 100,
          currentStep: 'Generation complete',
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });
    getBlueprint.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
          projectId,
          version: 1,
          status: 'confirmed',
          architecture: '初始架构',
          outline: '初始目录',
          source: 'ai',
          schemaVersion: 1,
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });
    saveChapterPlan.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
          projectId,
          blueprintId: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
          chapterNumber: 1,
          version: 1,
          status: 'draft',
          title: '信件抵达',
          goal: '让主角决定重查失踪案。',
          conflict: '',
          characters: ['林雾'],
          location: '',
          timeConstraint: '',
          foreshadowing: '',
          hook: '',
          source: 'author',
          schemaVersion: 1,
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText('项目名称'), {
      target: { value: '雾港来信' },
    });
    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));
    setStoryPremise('一封迟到二十年的信件，让雾港的失踪案重新浮出水面。');
    fireEvent.click(screen.getByRole('button', { name: '生成故事架构' }));

    expect(await screen.findByText('章节计划')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('章节标题'), {
      target: { value: '信件抵达' },
    });
    fireEvent.change(screen.getByLabelText('本章目标'), {
      target: { value: '让主角决定重查失踪案。' },
    });
    fireEvent.change(screen.getByLabelText('出场人物'), {
      target: { value: '林雾' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存计划' }));

    await waitFor(() => {
      expect(saveChapterPlan).toHaveBeenCalledWith({
        params: { projectId, chapterNumber: 1 },
        body: {
          title: '信件抵达',
          goal: '让主角决定重查失踪案。',
          conflict: '',
          characters: ['林雾'],
          location: '',
          timeConstraint: '',
          foreshadowing: '',
          hook: '',
        },
      });
    });

    fireEvent.change(screen.getByLabelText('章节'), { target: { value: '2' } });
    await waitFor(() => {
      expect(screen.getByLabelText('章节标题')).toHaveValue('');
      expect(screen.getByLabelText('本章目标')).toHaveValue('');
    });
  });

  it('queues a draft from a confirmed chapter plan and renders its immutable snapshot', async () => {
    const projectId = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1';
    const blueprint = {
      id: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
      projectId,
      version: 1,
      status: 'confirmed',
      architecture: '初始架构',
      outline: '初始目录',
      source: 'ai',
      schemaVersion: 1,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    const plan = {
      id: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      projectId,
      blueprintId: blueprint.id,
      chapterNumber: 1,
      version: 1,
      status: 'confirmed',
      title: '信件抵达',
      goal: '重查旧案',
      conflict: '',
      characters: ['林雾'],
      location: '',
      timeConstraint: '',
      foreshadowing: '',
      hook: '',
      source: 'author',
      schemaVersion: 1,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    createProject.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
          project: {
            id: projectId,
            title: '雾港来信',
            format: 'novel',
            genre: '悬疑',
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: 'succeeded',
          progress: 100,
          currentStep: 'Generation complete',
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });
    getBlueprint.mockResolvedValue({ status: 200, body: { data: blueprint } });
    getChapterPlan.mockResolvedValue({ status: 200, body: { data: plan } });
    createChapterDraft.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
          project: {
            id: projectId,
            title: '雾港来信',
            format: 'novel',
            genre: '悬疑',
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: 'succeeded',
          progress: 100,
          currentStep: 'Generation complete',
          artifact: { chapterDraft: '雨声先于信件抵达。' },
          revisionId: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: '雾港来信' } });
    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));
    setStoryPremise('一封迟到二十年的信件，让雾港的失踪案重新浮出水面。');
    fireEvent.click(screen.getByRole('button', { name: '生成故事架构' }));
    expect(
      await screen.findByRole('button', { name: '生成本章草稿' }, { timeout: 5_000 }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('本次附加要求'), { target: { value: '先写雨声。' } });
    fireEvent.click(screen.getByRole('button', { name: '生成本章草稿' }));

    await waitFor(() =>
      expect(createChapterDraft).toHaveBeenCalledWith({
        params: { projectId, chapterNumber: 1 },
        body: { prompt: '先写雨声。' },
      }),
    );
    expect(await screen.findByLabelText('章节草稿快照')).toHaveValue('雨声先于信件抵达。');
  });

  it('restores a previous draft by switching the current draft pointer', async () => {
    const projectId = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1';
    const latestRevisionId = 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a';
    const previousRevisionId = 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c';
    const blueprint = {
      id: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
      projectId,
      version: 1,
      status: 'confirmed',
      architecture: '初始架构',
      outline: '初始目录',
      source: 'ai',
      schemaVersion: 1,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    const plan = {
      id: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      projectId,
      blueprintId: blueprint.id,
      chapterNumber: 1,
      version: 1,
      status: 'confirmed',
      title: '信件抵达',
      goal: '重查旧案',
      conflict: '',
      characters: ['林雾'],
      location: '',
      timeConstraint: '',
      foreshadowing: '',
      hook: '',
      source: 'author',
      schemaVersion: 1,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    const previousRevision = {
      id: previousRevisionId,
      projectId,
      chapterPlanId: plan.id,
      runId: previousRevisionId,
      chapterNumber: 1,
      version: 1,
      status: 'draft',
      content: '第一版雨声。',
      wordCount: 1,
      promptSummary: '',
      source: 'ai',
      schemaVersion: 1,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    const latestRevision = {
      ...previousRevision,
      id: latestRevisionId,
      runId: latestRevisionId,
      version: 2,
      content: '第二版雨声。',
    };
    createProject.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: latestRevisionId,
          project: {
            id: projectId,
            title: '雾港来信',
            format: 'novel',
            genre: '悬疑',
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: 'succeeded',
          progress: 100,
          currentStep: 'Generation complete',
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });
    getBlueprint.mockResolvedValue({ status: 200, body: { data: blueprint } });
    getChapterPlan.mockResolvedValue({ status: 200, body: { data: plan } });
    listChapterRevisions.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [latestRevision, previousRevision],
          total: 2,
          page: 1,
          limit: 20,
          currentRevisionId: latestRevisionId,
        },
      },
    });
    compareChapterRevisions.mockResolvedValue({
      status: 200,
      body: {
        data: {
          baseRevisionId: latestRevisionId,
          comparisonRevisionId: previousRevisionId,
          segments: [
            { type: 'removed', text: '第二版雨声。' },
            { type: 'added', text: '第一版雨声。' },
          ],
        },
      },
    });
    restoreChapterRevision.mockResolvedValue({ status: 200, body: { data: previousRevision } });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: '雾港来信' } });
    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));
    setStoryPremise('一封迟到二十年的信件，让雾港的失踪案重新浮出水面。');
    fireEvent.click(screen.getByRole('button', { name: '生成故事架构' }));
    expect(await screen.findByText('草稿 v2')).toBeInTheDocument();
    expect(await screen.findByLabelText('草稿版本差异')).toHaveTextContent('第一版雨声。');
    await waitFor(() =>
      expect(compareChapterRevisions).toHaveBeenCalledWith({
        params: {
          projectId,
          chapterNumber: 1,
          revisionId: latestRevisionId,
          comparisonRevisionId: previousRevisionId,
        },
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '恢复' }));

    await waitFor(() =>
      expect(restoreChapterRevision).toHaveBeenCalledWith({
        params: { projectId, chapterNumber: 1, revisionId: previousRevisionId },
        body: {},
      }),
    );
    expect(await screen.findByDisplayValue('第一版雨声。')).not.toHaveAttribute('readonly');
    const { runId: _runId, ...authorRevision } = {
      ...previousRevision,
      id: 'b46cbd8b-a144-41cb-b1d4-256b196f9c9c',
      version: 3,
      content: '第一版雨声，林雾没有回头。',
      source: 'author' as const,
      sourceRevisionId: previousRevisionId,
      editSummary: '补充林雾的反应。',
    };
    createAuthorChapterRevision.mockResolvedValue({
      status: 201,
      body: { data: authorRevision },
    });
    fireEvent.change(screen.getByLabelText('草稿 v1 正文'), {
      target: { value: authorRevision.content },
    });

    await waitFor(
      () =>
        expect(createAuthorChapterRevision).toHaveBeenCalledWith({
          params: { projectId, chapterNumber: 1, revisionId: previousRevisionId },
          body: { content: authorRevision.content, editSummary: '' },
        }),
      { timeout: 2_000 },
    );
    expect(await screen.findByText('草稿 v3')).toBeInTheDocument();
  });

  it('submits a fact proposal without resolving it', async () => {
    const projectId = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1';
    const revisionId = 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a';
    const blueprint = {
      id: '7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c',
      projectId,
      version: 1,
      status: 'confirmed',
      architecture: '初始架构',
      outline: '初始目录',
      source: 'ai',
      schemaVersion: 1,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    const plan = {
      id: '227dd8ce-b405-4609-bffc-e88f8842e1ab',
      projectId,
      blueprintId: blueprint.id,
      chapterNumber: 1,
      version: 1,
      status: 'confirmed',
      title: '信件抵达',
      goal: '重查旧案',
      conflict: '',
      characters: ['林雾'],
      location: '',
      timeConstraint: '',
      foreshadowing: '',
      hook: '',
      source: 'author',
      schemaVersion: 1,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    const revision = {
      id: revisionId,
      projectId,
      chapterPlanId: plan.id,
      runId: revisionId,
      chapterNumber: 1,
      version: 1,
      status: 'draft',
      content: '林雾握紧信件。',
      wordCount: 1,
      promptSummary: '',
      source: 'ai',
      schemaVersion: 1,
      createdAt: '2026-07-24T02:00:00.000Z',
      updatedAt: '2026-07-24T02:00:00.000Z',
    };
    createProject.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: revisionId,
          project: {
            id: projectId,
            title: '雾港来信',
            format: 'novel',
            genre: '悬疑',
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: 'succeeded',
          progress: 100,
          currentStep: 'Generation complete',
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });
    getBlueprint.mockResolvedValue({ status: 200, body: { data: blueprint } });
    getChapterPlan.mockResolvedValue({ status: 200, body: { data: plan } });
    listChapterRevisions.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [revision],
          total: 1,
          page: 1,
          limit: 20,
          currentRevisionId: revisionId,
        },
      },
    });
    createFactChange.mockResolvedValue({
      status: 201,
      body: {
        data: {
          id: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
          projectId,
          revisionId,
          chapterNumber: 1,
          operation: 'add',
          factType: 'character',
          subject: '林雾',
          predicate: 'knows',
          proposedValue: '旧案线索',
          rationale: '',
          evidence: '林雾握紧信件。',
          source: 'author',
          status: 'proposed',
          createdAt: '2026-07-24T02:00:00.000Z',
          updatedAt: '2026-07-24T02:00:00.000Z',
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText('项目名称'), { target: { value: '雾港来信' } });
    fireEvent.click(screen.getByRole('button', { name: '建立项目' }));
    setStoryPremise('一封迟到二十年的信件，让雾港的失踪案重新浮出水面。');
    fireEvent.click(screen.getByRole('button', { name: '生成故事架构' }));
    expect(await screen.findByText('事实建议')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('主体'), { target: { value: '林雾' } });
    fireEvent.change(screen.getByLabelText('关系或属性'), { target: { value: 'knows' } });
    fireEvent.change(screen.getByLabelText('建议事实值'), { target: { value: '旧案线索' } });
    fireEvent.click(screen.getByRole('button', { name: '提交事实建议' }));

    await waitFor(() =>
      expect(createFactChange).toHaveBeenCalledWith({
        params: { projectId, chapterNumber: 1, revisionId },
        body: {
          operation: 'add',
          factType: 'character',
          subject: '林雾',
          predicate: 'knows',
          proposedValue: '旧案线索',
          rationale: '',
          evidence: '',
        },
      }),
    );
    expect(await screen.findByText('待裁决')).toBeInTheDocument();
  });
});
