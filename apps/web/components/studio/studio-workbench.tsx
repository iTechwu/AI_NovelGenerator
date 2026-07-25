'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  Bold,
  Check,
  Clapperboard,
  CircleAlert,
  Download,
  FileText,
  FolderOpen,
  Heading3,
  Italic,
  List,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@repo/ui';
import { studioClient } from '@/lib/api/contracts/client';
import {
  emptyProjectNavigationState,
  publishProjectNavigationState,
} from '@/lib/studio/project-navigation';
import { ensureValidToken } from '@/lib/api';
import { API_CONFIG } from '@/config';
import type {
  CreateStudioProject,
  GenerationJob,
  StudioBlueprint,
  StudioChapterPlan,
  StudioChapterRevision,
  StudioChapterRevisionDiff,
  StudioFact,
  StudioFactChange,
  CreateStudioFactChange,
  CreateStudioAdaptation,
  StudioProjectListResponse,
  StudioProjectOverview,
  StudioProjectImportPreview,
  StudioFinalizationTask,
  StudioChapterFinalization,
  StudioReviewFinding,
  StudioAdaptationProject,
  UpdateStudioChapterPlan,
} from '@repo/contracts';

const initialProject: CreateStudioProject = {
  title: '',
  format: 'novel',
  genre: '悬疑',
  premise: '',
  chapterCount: 20,
  targetWordsPerChapter: 3000,
  guidance: '',
  generateOutline: true,
};

const studioGenres = ['悬疑', '科幻', '言情', '历史', '奇幻', '现实主义', '冒险'];

const terminalStatuses = new Set(['succeeded', 'failed', 'cancelled']);
type StudioProjectListItem = StudioProjectListResponse['list'][number];
type AdaptationDraft = Omit<CreateStudioAdaptation, 'rightsConfirmed'> & {
  rightsConfirmed: boolean;
};

const initialAdaptationDraft: AdaptationDraft = {
  targetFormat: 'series',
  episodeCount: 12,
  minutesPerEpisode: 45,
  targetAudience: '',
  adaptationGoal: '',
  mustPreserve: '',
  rightsConfirmed: false,
};

const initialChapterPlan: UpdateStudioChapterPlan = {
  title: '',
  goal: '',
  conflict: '',
  characters: [],
  location: '',
  timeConstraint: '',
  foreshadowing: '',
  hook: '',
};

function statusLabel(status: GenerationJob['status']): string {
  return {
    queued: '等待执行',
    running: '生成中',
    succeeded: '已完成',
    failed: '生成失败',
    cancelled: '已取消',
  }[status];
}

function statusVariant(
  status: GenerationJob['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'succeeded') return 'default';
  if (status === 'failed') return 'destructive';
  if (status === 'running') return 'secondary';
  return 'outline';
}

function StoryPremiseEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && document.activeElement !== editor && editor.innerText !== value) {
      editor.innerText = value;
    }
  }, [value]);

  const applyFormat = (command: string, commandValue?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, commandValue);
    onChange(editor.innerText);
  };

  const syncText = (event: React.FormEvent<HTMLDivElement>) => {
    const editor = event.currentTarget;
    const fallbackValue = (editor as unknown as { value?: string }).value;
    onChange((editor.innerText || editor.textContent || fallbackValue || '').slice(0, 4000));
  };

  return (
    <div className="overflow-hidden rounded-md border bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
      <div className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
        <button
          type="button"
          aria-label="加粗"
          title="加粗"
          className="inline-flex size-7 items-center justify-center rounded-sm hover:bg-accent"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat('bold')}
        >
          <Bold className="size-4" />
        </button>
        <button
          type="button"
          aria-label="斜体"
          title="斜体"
          className="inline-flex size-7 items-center justify-center rounded-sm hover:bg-accent"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat('italic')}
        >
          <Italic className="size-4" />
        </button>
        <button
          type="button"
          aria-label="小标题"
          title="小标题"
          className="inline-flex size-7 items-center justify-center rounded-sm hover:bg-accent"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat('formatBlock', 'h3')}
        >
          <Heading3 className="size-4" />
        </button>
        <button
          type="button"
          aria-label="项目列表"
          title="项目列表"
          className="inline-flex size-7 items-center justify-center rounded-sm hover:bg-accent"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat('insertUnorderedList')}
        >
          <List className="size-4" />
        </button>
      </div>
      <div
        ref={editorRef}
        id="premise"
        role="textbox"
        aria-labelledby="premise-label"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="描述主角、冲突、世界背景和你希望故事抵达的结局。"
        className="story-premise-editor min-h-36 px-3 py-3 text-sm leading-6 outline-none"
        onInput={syncText}
        onChange={syncText}
      />
    </div>
  );
}

export function StudioWorkbench() {
  const [project, setProject] = useState<CreateStudioProject>(initialProject);
  const [isProjectSetupStarted, setIsProjectSetupStarted] = useState(false);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [blueprint, setBlueprint] = useState<StudioBlueprint | null>(null);
  const [blueprintHistory, setBlueprintHistory] = useState<StudioBlueprint[]>([]);
  const [blueprintRestoreNotice, setBlueprintRestoreNotice] = useState<string | null>(null);
  const [restoringBlueprintId, setRestoringBlueprintId] = useState<string | null>(null);
  const [chapterPlan, setChapterPlan] = useState<StudioChapterPlan | null>(null);
  const [chapterPlanDraft, setChapterPlanDraft] =
    useState<UpdateStudioChapterPlan>(initialChapterPlan);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterRevisions, setChapterRevisions] = useState<StudioChapterRevision[]>([]);
  const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null);
  const [currentFinalRevisionId, setCurrentFinalRevisionId] = useState<string | null>(null);
  const [chapterFinalizations, setChapterFinalizations] = useState<StudioChapterFinalization[]>([]);
  const [restoringFinalRevisionId, setRestoringFinalRevisionId] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<StudioChapterRevision | null>(null);
  const [revisionContent, setRevisionContent] = useState('');
  const [revisionEditSummary, setRevisionEditSummary] = useState('');
  const [hasUnsavedRevisionChanges, setHasUnsavedRevisionChanges] = useState(false);
  const [revisionSaveState, setRevisionSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'failed'
  >('idle');
  const [revisionLastSavedAt, setRevisionLastSavedAt] = useState<Date | null>(null);
  const [comparisonRevisionId, setComparisonRevisionId] = useState<string | null>(null);
  const [revisionDiff, setRevisionDiff] = useState<StudioChapterRevisionDiff | null>(null);
  const [factChanges, setFactChanges] = useState<StudioFactChange[]>([]);
  const [confirmedFacts, setConfirmedFacts] = useState<StudioFact[]>([]);
  const [reviewFindings, setReviewFindings] = useState<StudioReviewFinding[]>([]);
  const [reviewResolutionDrafts, setReviewResolutionDrafts] = useState<
    Record<string, { reason: string; resolvedValue: string }>
  >({});
  const [resolvingReviewFindingId, setResolvingReviewFindingId] = useState<string | null>(null);
  const [factChangeDraft, setFactChangeDraft] = useState<CreateStudioFactChange>({
    operation: 'add',
    factType: 'character',
    subject: '',
    predicate: '',
    proposedValue: '',
    rationale: '',
    evidence: '',
  });
  const [editingFactChangeId, setEditingFactChangeId] = useState<string | null>(null);
  const [editedFactValue, setEditedFactValue] = useState('');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [projects, setProjects] = useState<StudioProjectListItem[]>([]);
  const [projectPage, setProjectPage] = useState(1);
  const [projectTotal, setProjectTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingMoreProjects, setIsLoadingMoreProjects] = useState(false);
  const [openingRunId, setOpeningRunId] = useState<string | null>(null);
  const [isSavingBlueprint, setIsSavingBlueprint] = useState(false);
  const [isSavingChapterPlan, setIsSavingChapterPlan] = useState(false);
  const [isGeneratingChapterDraft, setIsGeneratingChapterDraft] = useState(false);
  const [isRestoringChapterDraft, setIsRestoringChapterDraft] = useState(false);
  const [isFinalizingChapter, setIsFinalizingChapter] = useState(false);
  const [isSavingFactChange, setIsSavingFactChange] = useState(false);
  const [resolvingFactChangeId, setResolvingFactChangeId] = useState<string | null>(null);
  const factChangesRequestId = useRef(0);
  const projectsRequestId = useRef(0);
  const revisionSourceIdRef = useRef<string | null>(null);
  const recentlyCreatedRevisionIdRef = useRef<string | null>(null);
  const [isEditingConfirmedBlueprint, setIsEditingConfirmedBlueprint] = useState(false);
  const [isEditingConfirmedChapterPlan, setIsEditingConfirmedChapterPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const [chapterPlanError, setChapterPlanError] = useState<string | null>(null);
  const [projectOverview, setProjectOverview] = useState<StudioProjectOverview | null>(null);
  const [finalizationTasks, setFinalizationTasks] = useState<StudioFinalizationTask[]>([]);
  const [workspaceStatusError, setWorkspaceStatusError] = useState<string | null>(null);
  const [retryingFinalizationTaskId, setRetryingFinalizationTaskId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'md' | 'txt'>('md');
  const [forceExport, setForceExport] = useState(false);
  const [forceExportReason, setForceExportReason] = useState('');
  const [importPreview, setImportPreview] = useState<StudioProjectImportPreview | null>(null);
  const [acceptedImportFactCandidateIds, setAcceptedImportFactCandidateIds] = useState<string[]>(
    [],
  );
  const [isPreviewingImport, setIsPreviewingImport] = useState(false);
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isCancellingJob, setIsCancellingJob] = useState(false);
  const [isRetryingJob, setIsRetryingJob] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [adaptations, setAdaptations] = useState<StudioAdaptationProject[]>([]);
  const [adaptationDraft, setAdaptationDraft] = useState<AdaptationDraft>(initialAdaptationDraft);
  const [isLoadingAdaptations, setIsLoadingAdaptations] = useState(false);
  const [isCreatingAdaptation, setIsCreatingAdaptation] = useState(false);
  const [adaptationError, setAdaptationError] = useState<string | null>(null);
  const [selectedAdaptationId, setSelectedAdaptationId] = useState<string | null>(null);
  const [isSavingAdaptationBrief, setIsSavingAdaptationBrief] = useState(false);
  const [isConfirmingAdaptationBrief, setIsConfirmingAdaptationBrief] = useState(false);
  const selectedAdaptation = adaptations.find((item) => item.id === selectedAdaptationId) ?? null;
  const isAdaptationBriefEditable =
    !selectedAdaptation || selectedAdaptation.status === 'brief_draft';

  const loadProjects = useCallback(async (page = 1, append = false) => {
    const requestId = ++projectsRequestId.current;
    if (append) setIsLoadingMoreProjects(true);
    else setIsLoadingProjects(true);
    setLibraryError(null);

    try {
      const response = await studioClient.listProjects({
        query: { page, limit: 20 },
      });
      if (requestId !== projectsRequestId.current) return;
      if (response.status === 200) {
        setProjects((current) => {
          if (!append) return response.body.data.list;
          const projectById = new Map(current.map((project) => [project.id, project]));
          response.body.data.list.forEach((project) => projectById.set(project.id, project));
          return [...projectById.values()];
        });
        setProjectPage(response.body.data.page);
        setProjectTotal(response.body.data.total);
      } else {
        setLibraryError('作品库暂时无法加载。');
      }
    } catch {
      if (requestId === projectsRequestId.current) setLibraryError('作品库暂时无法加载。');
    } finally {
      if (requestId === projectsRequestId.current) {
        if (append) setIsLoadingMoreProjects(false);
        else setIsLoadingProjects(false);
      }
    }
  }, []);

  const loadProjectStatus = useCallback(async (projectId: string) => {
    setWorkspaceStatusError(null);
    try {
      const [overviewResponse, tasksResponse] = await Promise.all([
        studioClient.getProjectOverview({ params: { projectId } }),
        studioClient.listFinalizationTasks({
          params: { projectId },
          query: { page: 1, limit: 20 },
        }),
      ]);
      if (overviewResponse.status === 200) setProjectOverview(overviewResponse.body.data);
      if (tasksResponse.status === 200) setFinalizationTasks(tasksResponse.body.data.list);
    } catch {
      setWorkspaceStatusError('作品状态暂时无法加载。');
    }
  }, []);

  const loadAdaptations = useCallback(async (projectId: string) => {
    setIsLoadingAdaptations(true);
    setAdaptationError(null);
    try {
      const response = await studioClient.listAdaptations({
        params: { projectId },
        query: { page: 1, limit: 20 },
      });
      if (response.status === 200) setAdaptations(response.body.data.list);
      else setAdaptationError('改编项目暂时无法加载。');
    } catch {
      setAdaptationError('改编项目暂时无法加载。');
    } finally {
      setIsLoadingAdaptations(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProjects(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProjects]);

  useEffect(() => {
    if (!activeProjectId) {
      setProjectOverview(null);
      setFinalizationTasks([]);
      setAdaptations([]);
      setSelectedAdaptationId(null);
      setAdaptationDraft(initialAdaptationDraft);
      return;
    }
    const timer = window.setTimeout(() => {
      void loadProjectStatus(activeProjectId);
      void loadAdaptations(activeProjectId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeProjectId, loadAdaptations, loadProjectStatus]);

  useEffect(() => {
    if (!activeProjectId) return;
    let eventSource: EventSource | null = null;
    let disposed = false;
    void ensureValidToken()
      .then((token) => {
        if (!token || disposed) return;
        const url = new URL(
          `${API_CONFIG.baseUrl}/studio/projects/${activeProjectId}/events/stream`,
        );
        url.searchParams.set('access_token', token);
        eventSource = new EventSource(url.toString(), { withCredentials: true });
        eventSource.addEventListener(
          'studio-project-event',
          () => void loadProjectStatus(activeProjectId),
        );
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      eventSource?.close();
    };
  }, [activeProjectId, loadProjectStatus]);

  const loadBlueprint = useCallback(async (projectId: string) => {
    setBlueprintError(null);
    try {
      const response = await studioClient.getBlueprint({
        params: { projectId },
      });
      if (response.status === 200) setBlueprint(response.body.data);
    } catch {
      setBlueprintError('蓝图暂时无法加载。');
    }
  }, []);

  const loadBlueprintHistory = useCallback(async (projectId: string) => {
    try {
      const response = await studioClient.listBlueprints({
        params: { projectId },
        query: { page: 1, limit: 50 },
      });
      if (response.status === 200) setBlueprintHistory(response.body.data.list);
    } catch {
      setBlueprintHistory([]);
    }
  }, []);

  useEffect(() => {
    if (job?.status !== 'succeeded') return;

    const timer = window.setTimeout(() => void loadBlueprint(job.project.id), 0);
    return () => window.clearTimeout(timer);
  }, [job, loadBlueprint]);

  useEffect(() => {
    if (!blueprint) {
      setBlueprintHistory([]);
      return;
    }
    void loadBlueprintHistory(blueprint.projectId);
  }, [blueprint?.projectId, blueprint?.updatedAt, loadBlueprintHistory]);

  const loadChapterPlan = useCallback(async (projectId: string, nextChapterNumber: number) => {
    setChapterPlanError(null);
    try {
      const response = await studioClient.getChapterPlan({
        params: { projectId, chapterNumber: nextChapterNumber },
      });
      if (response.status === 200) {
        setChapterPlan(response.body.data);
        setIsEditingConfirmedChapterPlan(false);
        setChapterPlanDraft({
          title: response.body.data.title,
          goal: response.body.data.goal,
          conflict: response.body.data.conflict,
          characters: response.body.data.characters,
          location: response.body.data.location,
          timeConstraint: response.body.data.timeConstraint,
          foreshadowing: response.body.data.foreshadowing,
          hook: response.body.data.hook,
        });
      } else {
        setChapterPlan(null);
        setChapterPlanDraft(initialChapterPlan);
        setIsEditingConfirmedChapterPlan(false);
      }
    } catch {
      setChapterPlan(null);
      setChapterPlanDraft(initialChapterPlan);
    }
  }, []);

  useEffect(() => {
    if (blueprint?.status !== 'confirmed' || isEditingConfirmedBlueprint) return;

    const timer = window.setTimeout(
      () => void loadChapterPlan(blueprint.projectId, chapterNumber),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [blueprint, chapterNumber, isEditingConfirmedBlueprint, loadChapterPlan]);

  const loadChapterRevisions = useCallback(async (projectId: string, nextChapterNumber: number) => {
    try {
      const response = await studioClient.listChapterRevisions({
        params: { projectId, chapterNumber: nextChapterNumber },
        query: { page: 1, limit: 20 },
      });
      if (response.status === 200) {
        const {
          list,
          currentRevisionId: nextCurrentRevisionId,
          currentFinalRevisionId: nextCurrentFinalRevisionId,
        } = response.body.data;
        setChapterRevisions(list);
        setCurrentRevisionId(nextCurrentRevisionId ?? null);
        setCurrentFinalRevisionId(nextCurrentFinalRevisionId ?? null);
        setSelectedRevision(
          list.find((revision) => revision.id === nextCurrentRevisionId) ?? list[0] ?? null,
        );
        const selectedId =
          list.find((revision) => revision.id === nextCurrentRevisionId)?.id ?? list[0]?.id;
        setComparisonRevisionId(list.find((revision) => revision.id !== selectedId)?.id ?? null);
      }
    } catch {
      setChapterRevisions([]);
      setCurrentRevisionId(null);
      setCurrentFinalRevisionId(null);
      setSelectedRevision(null);
      setComparisonRevisionId(null);
      setRevisionDiff(null);
    }
  }, []);

  const loadChapterFinalizations = useCallback(
    async (projectId: string, nextChapterNumber: number) => {
      try {
        const response = await studioClient.listChapterFinalizations({
          params: { projectId, chapterNumber: nextChapterNumber },
          query: { page: 1, limit: 50 },
        });
        if (response.status === 200) setChapterFinalizations(response.body.data.list);
      } catch {
        setChapterFinalizations([]);
      }
    },
    [],
  );

  useEffect(() => {
    if (chapterPlan?.status !== 'confirmed') return;
    const timer = window.setTimeout(
      () => void loadChapterRevisions(chapterPlan.projectId, chapterPlan.chapterNumber),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [chapterPlan, job?.revisionId, loadChapterRevisions]);

  useEffect(() => {
    if (!blueprint) {
      setChapterFinalizations([]);
      return;
    }
    void loadChapterFinalizations(blueprint.projectId, chapterNumber);
  }, [blueprint?.projectId, chapterNumber, currentFinalRevisionId, loadChapterFinalizations]);

  useEffect(() => {
    if (!blueprint || !selectedRevision || !comparisonRevisionId) {
      setRevisionDiff(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await studioClient.compareChapterRevisions({
          params: {
            projectId: blueprint.projectId,
            chapterNumber,
            revisionId: selectedRevision.id,
            comparisonRevisionId,
          },
        });
        if (response.status === 200) setRevisionDiff(response.body.data);
      } catch {
        setRevisionDiff(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [blueprint, chapterNumber, selectedRevision, comparisonRevisionId]);

  useEffect(() => {
    revisionSourceIdRef.current = selectedRevision?.id ?? null;
    setRevisionContent(selectedRevision?.content ?? '');
    setRevisionEditSummary(selectedRevision?.editSummary ?? '');
    setFactChanges([]);
    setHasUnsavedRevisionChanges(false);
    if (recentlyCreatedRevisionIdRef.current === selectedRevision?.id) {
      recentlyCreatedRevisionIdRef.current = null;
      return;
    }
    setRevisionSaveState('idle');
    setRevisionLastSavedAt(null);
  }, [selectedRevision?.id]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedRevisionChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedRevisionChanges]);

  const loadFactChanges = useCallback(
    async (projectId: string, chapter: number, revisionId: string) => {
      const requestId = ++factChangesRequestId.current;
      try {
        const response = await studioClient.listFactChanges({
          params: { projectId, chapterNumber: chapter, revisionId },
          query: { page: 1, limit: 50 },
        });
        if (response.status === 200 && requestId === factChangesRequestId.current) {
          setFactChanges((current) => {
            const serverIds = new Set(response.body.data.list.map((change) => change.id));
            return [
              ...response.body.data.list,
              ...current.filter((change) => !serverIds.has(change.id)),
            ];
          });
        }
      } catch {
        if (requestId === factChangesRequestId.current) setFactChanges([]);
      }
    },
    [],
  );

  const loadConfirmedFacts = useCallback(async (projectId: string) => {
    try {
      const response = await studioClient.listFacts({
        params: { projectId },
        query: { page: 1, limit: 100 },
      });
      if (response.status === 200) setConfirmedFacts(response.body.data.list);
    } catch {
      setConfirmedFacts([]);
    }
  }, []);

  const loadReviewFindings = useCallback(
    async (projectId: string, chapter: number, revisionId: string) => {
      try {
        const response = await studioClient.listReviewFindings({
          params: { projectId, chapterNumber: chapter, revisionId },
          query: { page: 1, limit: 50 },
        });
        if (response.status === 200) setReviewFindings(response.body.data.list);
      } catch {
        setReviewFindings([]);
      }
    },
    [],
  );

  useEffect(() => {
    if (!blueprint) {
      setConfirmedFacts([]);
      return;
    }
    void loadConfirmedFacts(blueprint.projectId);
  }, [blueprint, loadConfirmedFacts]);

  useEffect(() => {
    if (!blueprint || !selectedRevision) {
      setFactChanges([]);
      return;
    }
    setFactChanges([]);
    const timer = window.setTimeout(
      () => void loadFactChanges(blueprint.projectId, chapterNumber, selectedRevision.id),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [blueprint, chapterNumber, selectedRevision, loadFactChanges]);

  useEffect(() => {
    if (!blueprint || !selectedRevision) {
      setReviewFindings([]);
      return;
    }
    void loadReviewFindings(blueprint.projectId, chapterNumber, selectedRevision.id);
  }, [blueprint, chapterNumber, selectedRevision, loadReviewFindings]);

  useEffect(() => {
    if (!job || terminalStatuses.has(job.status)) return;

    const timer = window.setTimeout(async () => {
      try {
        const response = await studioClient.getJob({
          params: { jobId: job.id },
        });
        if (response.status === 200) setJob(response.body.data);
      } catch {
        setError('任务状态暂时无法刷新。');
      }
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [job]);

  const updateProject = <K extends keyof CreateStudioProject>(
    key: K,
    value: CreateStudioProject[K],
  ) => {
    setProject((current) => ({ ...current, [key]: value }));
  };

  const startProjectSetup = () => {
    if (!project.title.trim()) {
      setError('请先为项目命名。');
      return;
    }
    setError(null);
    setIsProjectSetupStarted(true);
    window.setTimeout(() => document.getElementById('genre')?.focus(), 0);
  };

  const previewProjectImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(txt|md|docx)$/iu.test(file.name)) {
      setImportError('仅支持 UTF-8 编码的 TXT、Markdown 或 DOCX 文件。');
      return;
    }
    if (file.size > 7_500_000) {
      setImportError('单个存稿文件不能超过 7.5 MB。');
      return;
    }
    setIsPreviewingImport(true);
    setImportError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('file-read-failed'));
        reader.readAsDataURL(file);
      });
      const contentBase64 = dataUrl.split(',', 2)[1];
      if (!contentBase64) throw new Error('missing-base64');
      const response = await studioClient.previewProjectImport({
        body: {
          filename: file.name,
          format: file.name.toLowerCase().endsWith('.docx')
            ? 'docx'
            : file.name.toLowerCase().endsWith('.md')
              ? 'md'
              : 'txt',
          contentBase64,
        },
      });
      if (response.status !== 201) {
        setImportError('存稿预览暂时无法创建。');
        return;
      }
      setImportPreview(response.body.data);
      setAcceptedImportFactCandidateIds([]);
      setProject((current) => ({
        ...current,
        title: current.title || file.name.replace(/\.(txt|md|docx)$/iu, ''),
        chapterCount: response.body.data.chapters.length,
        generateOutline: false,
      }));
    } catch {
      setImportError('无法读取或解析该存稿，请确认编码后重试。');
    } finally {
      setIsPreviewingImport(false);
    }
  };

  const confirmProjectImport = async () => {
    if (!importPreview) return;
    if (!project.title.trim() || !project.genre.trim()) {
      setImportError('请先填写项目名称和题材。');
      return;
    }
    setIsConfirmingImport(true);
    setImportError(null);
    try {
      const response = await studioClient.confirmProjectImport({
        params: { importId: importPreview.importId },
        body: {
          title: project.title.trim(),
          genre: project.genre.trim(),
          guidance: project.guidance,
          targetWordsPerChapter: project.targetWordsPerChapter,
          acceptedFactCandidateIds: acceptedImportFactCandidateIds,
        },
      });
      if (response.status !== 201) {
        setImportError('存稿确认迁移失败。');
        return;
      }
      setImportPreview(null);
      setAcceptedImportFactCandidateIds([]);
      setSelectedAdaptationId(null);
      setAdaptationDraft(initialAdaptationDraft);
      setActiveProjectId(response.body.data.project.id);
      await Promise.all([loadProjects(), loadBlueprint(response.body.data.project.id)]);
    } catch {
      setImportError('存稿确认迁移失败。');
    } finally {
      setIsConfirmingImport(false);
    }
  };

  const cancelJob = async () => {
    if (!job || terminalStatuses.has(job.status)) return;
    setIsCancellingJob(true);
    setError(null);
    try {
      const response = await studioClient.cancelJob({ params: { jobId: job.id }, body: {} });
      if (response.status === 202) {
        setJob(response.body.data);
        void loadProjects();
      } else setError('创作任务暂时无法取消。');
    } catch {
      setError('创作任务暂时无法取消。');
    } finally {
      setIsCancellingJob(false);
    }
  };

  const retryJob = async () => {
    if (!job || (job.status !== 'failed' && job.status !== 'cancelled')) return;
    setIsRetryingJob(true);
    setError(null);
    try {
      const response = await studioClient.retryJob({ params: { jobId: job.id }, body: {} });
      if (response.status === 202) {
        setJob(response.body.data);
        void loadProjects();
      } else setError('创作任务暂时无法恢复。');
    } catch {
      setError('创作任务暂时无法恢复。');
    } finally {
      setIsRetryingJob(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (project.premise.trim().length < 20) {
      setError('故事梗概至少需要 20 个字符。');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setBlueprint(null);
    setIsEditingConfirmedBlueprint(false);
    setChapterPlan(null);
    setChapterPlanDraft(initialChapterPlan);
    setIsEditingConfirmedChapterPlan(false);

    try {
      const response = await studioClient.createProject({ body: project });
      if (response.status === 202) {
        setJob(response.body.data);
        setSelectedAdaptationId(null);
        setAdaptationDraft(initialAdaptationDraft);
        setActiveProjectId(response.body.data.project.id);
        void loadProjects();
      } else {
        setError('项目没有成功进入生成队列。请在作品库确认项目状态。');
        void loadProjects();
      }
    } catch {
      setError('创建请求未完成。请先在作品库确认是否已有该作品。');
      void loadProjects();
    } finally {
      setIsSubmitting(false);
    }
  };

  const openProject = async (item: StudioProjectListItem) => {
    setOpeningRunId(item.id);
    setError(null);
    setIsProjectSetupStarted(true);
    setSelectedAdaptationId(null);
    setAdaptationDraft(initialAdaptationDraft);
    setActiveProjectId(item.id);
    setJob(null);
    setBlueprint(null);
    setIsEditingConfirmedBlueprint(false);
    setChapterPlan(null);
    setChapterPlanDraft(initialChapterPlan);
    setIsEditingConfirmedChapterPlan(false);
    try {
      await loadBlueprint(item.id);
      if (item.latestRun) {
        const response = await studioClient.getJob({
          params: { jobId: item.latestRun.id },
        });
        if (response.status === 200) {
          setJob(response.body.data);
        } else {
          setError('无法打开该作品的最近任务。');
        }
      }
    } catch {
      setError('无法打开该作品。');
    } finally {
      setOpeningRunId(null);
    }
  };

  const saveAdaptationBrief = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProjectId || (!selectedAdaptation && !adaptationDraft.rightsConfirmed)) return;
    setAdaptationError(null);
    const brief = {
      targetFormat: adaptationDraft.targetFormat,
      episodeCount: adaptationDraft.episodeCount,
      minutesPerEpisode: adaptationDraft.minutesPerEpisode,
      targetAudience: adaptationDraft.targetAudience,
      adaptationGoal: adaptationDraft.adaptationGoal,
      mustPreserve: adaptationDraft.mustPreserve,
    };
    try {
      if (selectedAdaptation) {
        setIsSavingAdaptationBrief(true);
        const response = await studioClient.updateAdaptationBrief({
          params: { adaptationId: selectedAdaptation.id },
          body: brief,
        });
        if (response.status !== 200) {
          setAdaptationError('改编简报保存失败。');
          return;
        }
        setAdaptations((current) =>
          current.map((item) => (item.id === response.body.data.id ? response.body.data : item)),
        );
        return;
      }
      setIsCreatingAdaptation(true);
      const response = await studioClient.createAdaptation({
        params: { projectId: activeProjectId },
        body: { ...brief, rightsConfirmed: true },
      });
      if (response.status !== 201) {
        setAdaptationError('改编项目创建失败。');
        return;
      }
      setAdaptations((current) => [response.body.data, ...current]);
      setSelectedAdaptationId(response.body.data.id);
      setAdaptationDraft({ ...brief, rightsConfirmed: true });
    } catch {
      setAdaptationError(
        selectedAdaptation
          ? '改编简报保存失败。'
          : '改编项目创建失败，请确认来源章节已定稿后重试。',
      );
    } finally {
      setIsCreatingAdaptation(false);
      setIsSavingAdaptationBrief(false);
    }
  };

  const selectAdaptation = (adaptation: StudioAdaptationProject) => {
    setSelectedAdaptationId(adaptation.id);
    setAdaptationError(null);
    setAdaptationDraft({
      targetFormat: adaptation.targetFormat,
      episodeCount: adaptation.episodeCount,
      minutesPerEpisode: adaptation.minutesPerEpisode,
      targetAudience: adaptation.targetAudience,
      adaptationGoal: adaptation.adaptationGoal,
      mustPreserve: adaptation.mustPreserve,
      rightsConfirmed: true,
    });
  };

  const confirmAdaptationBrief = async () => {
    if (!selectedAdaptation || selectedAdaptation.status !== 'brief_draft') return;
    setIsConfirmingAdaptationBrief(true);
    setAdaptationError(null);
    try {
      const response = await studioClient.confirmAdaptationBrief({
        params: { adaptationId: selectedAdaptation.id },
        body: {},
      });
      if (response.status !== 200) {
        setAdaptationError('改编简报确认失败。');
        return;
      }
      setAdaptations((current) =>
        current.map((item) => (item.id === response.body.data.id ? response.body.data : item)),
      );
    } catch {
      setAdaptationError('改编简报确认失败，请补全必填内容后重试。');
    } finally {
      setIsConfirmingAdaptationBrief(false);
    }
  };

  const saveBlueprint = async () => {
    if (!blueprint || (blueprint.status === 'confirmed' && !isEditingConfirmedBlueprint)) return;

    setIsSavingBlueprint(true);
    setBlueprintError(null);
    try {
      const response = await studioClient.updateBlueprint({
        params: { projectId: blueprint.projectId },
        body: {
          architecture: blueprint.architecture,
          outline: blueprint.outline,
        },
      });
      if (response.status === 200) {
        setBlueprint(response.body.data);
        setIsEditingConfirmedBlueprint(false);
      } else setBlueprintError('蓝图保存失败。');
    } catch {
      setBlueprintError('蓝图保存失败。');
    } finally {
      setIsSavingBlueprint(false);
    }
  };

  const confirmBlueprint = async () => {
    if (!blueprint || blueprint.status === 'confirmed') return;

    setIsSavingBlueprint(true);
    setBlueprintError(null);
    try {
      const response = await studioClient.confirmBlueprint({
        params: { projectId: blueprint.projectId },
        body: {},
      });
      if (response.status === 200) setBlueprint(response.body.data);
      else setBlueprintError('蓝图确认失败。');
    } catch {
      setBlueprintError('蓝图确认失败。');
    } finally {
      setIsSavingBlueprint(false);
    }
  };

  const restoreBlueprint = async (target: StudioBlueprint) => {
    if (!blueprint || target.id === blueprint.id || target.status !== 'confirmed') return;
    if (!window.confirm(`恢复蓝图 v${target.version} 会要求受影响章节重新复核。是否继续？`)) return;
    setRestoringBlueprintId(target.id);
    setBlueprintError(null);
    try {
      const response = await studioClient.restoreBlueprint({
        params: { projectId: blueprint.projectId, blueprintId: target.id },
        body: {},
      });
      if (response.status === 200) {
        setBlueprint(response.body.data.blueprint);
        setBlueprintRestoreNotice(
          response.body.data.affectedChapterNumbers.length > 0
            ? `已恢复蓝图 v${target.version}；第 ${response.body.data.affectedChapterNumbers.join('、')} 章需要复核。`
            : `已恢复蓝图 v${target.version}。`,
        );
        await Promise.all([
          loadBlueprintHistory(blueprint.projectId),
          loadProjectStatus(blueprint.projectId),
        ]);
      } else setBlueprintError('蓝图恢复失败。');
    } catch {
      setBlueprintError('蓝图恢复失败。');
    } finally {
      setRestoringBlueprintId(null);
    }
  };

  const saveChapterPlan = async () => {
    if (!blueprint || blueprint.status !== 'confirmed') return;

    setIsSavingChapterPlan(true);
    setChapterPlanError(null);
    try {
      const response = await studioClient.saveChapterPlan({
        params: { projectId: blueprint.projectId, chapterNumber },
        body: chapterPlanDraft,
      });
      if (response.status === 200) {
        setChapterPlan(response.body.data);
        setIsEditingConfirmedChapterPlan(false);
      } else {
        setChapterPlanError('章节计划保存失败。');
      }
    } catch {
      setChapterPlanError('章节计划保存失败。');
    } finally {
      setIsSavingChapterPlan(false);
    }
  };

  const confirmChapterPlan = async () => {
    if (
      !blueprint ||
      !chapterPlan ||
      (chapterPlan.status === 'confirmed' && !chapterPlan.needsReview)
    )
      return;

    setIsSavingChapterPlan(true);
    setChapterPlanError(null);
    try {
      const response = await studioClient.confirmChapterPlan({
        params: { projectId: blueprint.projectId, chapterNumber },
        body: {},
      });
      if (response.status === 200) {
        setChapterPlan(response.body.data);
      } else {
        setChapterPlanError('章节计划确认失败。');
      }
    } catch {
      setChapterPlanError('章节计划确认失败。');
    } finally {
      setIsSavingChapterPlan(false);
    }
  };

  const createChapterDraft = async () => {
    if (!blueprint || !chapterPlan || chapterPlan.status !== 'confirmed' || chapterPlan.needsReview)
      return;

    setIsGeneratingChapterDraft(true);
    setChapterPlanError(null);
    setError(null);
    try {
      const response = await studioClient.createChapterDraft({
        params: { projectId: blueprint.projectId, chapterNumber },
        body: { prompt: draftPrompt },
      });
      if (response.status === 202) {
        setJob(response.body.data);
        void loadProjects();
      } else {
        setChapterPlanError('章节草稿没有成功进入生成队列。');
      }
    } catch {
      setChapterPlanError('章节草稿请求未完成。请在任务中心确认任务状态。');
      void loadProjects();
      void loadProjectStatus(blueprint.projectId);
    } finally {
      setIsGeneratingChapterDraft(false);
    }
  };

  const restoreChapterDraft = async (revision: StudioChapterRevision) => {
    if (!blueprint) return;
    setIsRestoringChapterDraft(true);
    setChapterPlanError(null);
    try {
      const response = await studioClient.restoreChapterRevision({
        params: {
          projectId: blueprint.projectId,
          chapterNumber,
          revisionId: revision.id,
        },
        body: {},
      });
      if (response.status === 200) {
        setCurrentRevisionId(response.body.data.id);
        setSelectedRevision(response.body.data);
      } else {
        setChapterPlanError('恢复章节草稿失败。');
      }
    } catch {
      setChapterPlanError('恢复章节草稿失败。');
    } finally {
      setIsRestoringChapterDraft(false);
    }
  };

  const restoreFinalRevision = async (finalization: StudioChapterFinalization) => {
    if (!blueprint || finalization.revisionId === currentFinalRevisionId) return;
    if (!window.confirm('恢复历史终稿会同步该版本的事实快照，并标记后续章节计划待复核。是否继续？'))
      return;
    setRestoringFinalRevisionId(finalization.revisionId);
    try {
      const response = await studioClient.restoreFinalChapterRevision({
        params: {
          projectId: blueprint.projectId,
          chapterNumber,
          revisionId: finalization.revisionId,
        },
        body: {},
      });
      if (response.status === 200) {
        setCurrentFinalRevisionId(response.body.data.revision.id);
        await Promise.all([
          loadChapterRevisions(blueprint.projectId, chapterNumber),
          loadProjectStatus(blueprint.projectId),
        ]);
      } else setChapterPlanError('历史终稿恢复失败。');
    } catch {
      setChapterPlanError('历史终稿恢复失败。');
    } finally {
      setRestoringFinalRevisionId(null);
    }
  };

  const canEditSelectedRevision = Boolean(
    selectedRevision &&
    selectedRevision.id === currentRevisionId &&
    selectedRevision.status !== 'superseded',
  );

  const saveAuthorRevision = useCallback(async () => {
    if (
      !blueprint ||
      !canEditSelectedRevision ||
      !hasUnsavedRevisionChanges ||
      revisionSaveState === 'saving' ||
      !revisionContent.trim()
    ) {
      return;
    }
    const sourceRevisionId = revisionSourceIdRef.current;
    if (!sourceRevisionId) return;

    const content = revisionContent;
    const editSummary = revisionEditSummary;
    setRevisionSaveState('saving');
    setChapterPlanError(null);
    try {
      const response = await studioClient.createAuthorChapterRevision({
        params: {
          projectId: blueprint.projectId,
          chapterNumber,
          revisionId: sourceRevisionId,
        },
        body: { content, editSummary },
      });
      if (response.status !== 201) {
        setRevisionSaveState('failed');
        return;
      }
      const revision = response.body.data;
      revisionSourceIdRef.current = revision.id;
      recentlyCreatedRevisionIdRef.current = revision.id;
      setChapterRevisions((current) => [
        revision,
        ...current.filter((item) => item.id !== revision.id),
      ]);
      setCurrentRevisionId(revision.id);
      setSelectedRevision(revision);
      setHasUnsavedRevisionChanges(false);
      setRevisionSaveState('saved');
      setRevisionLastSavedAt(new Date());
    } catch {
      setRevisionSaveState('failed');
    }
  }, [
    blueprint,
    canEditSelectedRevision,
    chapterNumber,
    hasUnsavedRevisionChanges,
    revisionContent,
    revisionEditSummary,
    revisionSaveState,
  ]);

  useEffect(() => {
    if (
      !canEditSelectedRevision ||
      !hasUnsavedRevisionChanges ||
      revisionSaveState === 'saving' ||
      !revisionContent.trim()
    ) {
      return;
    }
    const timer = window.setTimeout(() => void saveAuthorRevision(), 750);
    return () => window.clearTimeout(timer);
  }, [
    canEditSelectedRevision,
    hasUnsavedRevisionChanges,
    revisionContent,
    revisionEditSummary,
    revisionSaveState,
    saveAuthorRevision,
  ]);

  const finalizeChapterDraft = async () => {
    if (!blueprint || !selectedRevision) return;
    setIsFinalizingChapter(true);
    setChapterPlanError(null);
    try {
      const response = await studioClient.finalizeChapterRevision({
        params: {
          projectId: blueprint.projectId,
          chapterNumber,
          revisionId: selectedRevision.id,
        },
        body: {},
      });
      if (response.status === 201) {
        setCurrentFinalRevisionId(response.body.data.revisionId);
        setChapterRevisions((current) =>
          current.map((revision) => ({
            ...revision,
            status:
              revision.id === response.body.data.revisionId
                ? 'finalized'
                : revision.id === currentFinalRevisionId
                  ? 'superseded'
                  : revision.status,
          })),
        );
        setSelectedRevision((current) =>
          current?.id === response.body.data.revisionId
            ? { ...current, status: 'finalized' }
            : current,
        );
      } else setChapterPlanError('章节定稿失败。请稍后重试。');
    } catch {
      setChapterPlanError('章节定稿失败。请先裁决全部事实建议并确认当前草稿。');
    } finally {
      setIsFinalizingChapter(false);
    }
  };

  const createFactChange = async () => {
    if (!blueprint || !selectedRevision) return;
    setIsSavingFactChange(true);
    try {
      const response = await studioClient.createFactChange({
        params: {
          projectId: blueprint.projectId,
          chapterNumber,
          revisionId: selectedRevision.id,
        },
        body: factChangeDraft,
      });
      if (response.status === 201) {
        factChangesRequestId.current += 1;
        setFactChanges((current) => [response.body.data, ...current]);
        setFactChangeDraft((current) => ({
          ...current,
          subject: '',
          predicate: '',
          proposedValue: '',
          rationale: '',
          evidence: '',
        }));
      } else setChapterPlanError('事实建议保存失败。');
    } catch {
      setChapterPlanError('事实建议保存失败。');
    } finally {
      setIsSavingFactChange(false);
    }
  };

  const resolveFactChange = async (
    change: StudioFactChange,
    decision: 'accept' | 'edit' | 'reject',
  ) => {
    if (!blueprint || !selectedRevision) return;
    setResolvingFactChangeId(change.id);
    try {
      const response = await studioClient.resolveFactChange({
        params: {
          projectId: blueprint.projectId,
          chapterNumber,
          revisionId: selectedRevision.id,
          changeId: change.id,
        },
        body: {
          decision,
          ...(decision === 'edit' ? { resolvedValue: editedFactValue } : {}),
        },
      });
      if (response.status === 200) {
        setFactChanges((current) =>
          current.map((item) => (item.id === change.id ? response.body.data : item)),
        );
        setEditingFactChangeId(null);
        setEditedFactValue('');
        void loadConfirmedFacts(blueprint.projectId);
      } else setChapterPlanError('事实建议裁决失败。');
    } catch {
      setChapterPlanError('事实建议裁决失败。');
    } finally {
      setResolvingFactChangeId(null);
    }
  };

  const resolveReviewFinding = async (
    finding: StudioReviewFinding,
    decision: 'resolve' | 'ignore' | 'intentional_change',
  ) => {
    const draft = reviewResolutionDrafts[finding.id] ?? { reason: '', resolvedValue: '' };
    if (
      !blueprint ||
      !selectedRevision ||
      !draft.reason.trim() ||
      (decision === 'intentional_change' && !draft.resolvedValue.trim())
    )
      return;
    setResolvingReviewFindingId(finding.id);
    try {
      const response = await studioClient.resolveReviewFinding({
        params: {
          projectId: blueprint.projectId,
          chapterNumber,
          revisionId: selectedRevision.id,
          findingId: finding.id,
        },
        body: {
          decision,
          reason: draft.reason.trim(),
          ...(decision === 'intentional_change'
            ? { resolvedValue: draft.resolvedValue.trim() }
            : {}),
        },
      });
      if (response.status === 200) {
        setReviewFindings((current) =>
          current.map((item) => (item.id === finding.id ? response.body.data : item)),
        );
        setReviewResolutionDrafts((current) => {
          const { [finding.id]: _, ...remaining } = current;
          return remaining;
        });
        void loadProjectStatus(blueprint.projectId);
      } else setChapterPlanError('审校问题处理失败。');
    } catch {
      setChapterPlanError('审校问题处理失败。');
    } finally {
      setResolvingReviewFindingId(null);
    }
  };

  const retryFinalizationTask = async (task: StudioFinalizationTask) => {
    if (!activeProjectId) return;
    setRetryingFinalizationTaskId(task.id);
    setWorkspaceStatusError(null);
    try {
      const response = await studioClient.retryFinalizationTask({
        params: { projectId: activeProjectId, taskId: task.id },
        body: {},
      });
      if (response.status === 200) {
        setFinalizationTasks((current) =>
          current.map((item) => (item.id === task.id ? response.body.data : item)),
        );
        void loadProjectStatus(activeProjectId);
      } else {
        setWorkspaceStatusError('后台任务暂时无法重试。');
      }
    } catch {
      setWorkspaceStatusError('后台任务暂时无法重试。');
    } finally {
      setRetryingFinalizationTaskId(null);
    }
  };

  const exportProject = async () => {
    if (!activeProjectId) return;
    if (forceExport && !forceExportReason.trim()) {
      setExportError('强制导出前必须说明原因。');
      return;
    }
    setIsExporting(true);
    setExportError(null);
    try {
      const response = await studioClient.exportProject({
        params: { projectId: activeProjectId },
        query: {
          format: exportFormat,
          force: forceExport,
          ...(forceExport ? { forceReason: forceExportReason.trim() } : {}),
        },
      });
      if (response.status !== 200) {
        setExportError('作品暂时无法导出。');
        return;
      }
      const file = new Blob([response.body.data.content], { type: response.body.data.contentType });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = response.body.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('作品暂时无法导出。请先处理阻断问题，或填写强制导出原因。');
    } finally {
      setIsExporting(false);
    }
  };

  const pendingFactChanges = factChanges.some((change) => change.status === 'proposed');
  const finalizationBlockedReason = !selectedRevision
    ? '请选择一个章节草稿。'
    : selectedRevision.status === 'finalized'
      ? '该版本已定稿；摘要和检索任务会在后台继续处理。'
      : selectedRevision.status === 'superseded'
        ? '已被替代的版本不能定稿。'
        : selectedRevision.id !== currentRevisionId
          ? '请先将此版本恢复为当前草稿。'
          : pendingFactChanges
            ? '请先裁决全部事实建议。'
            : '定稿会锁定此版本并创建摘要、检索任务。';

  useEffect(() => {
    publishProjectNavigationState({
      hasProject: Boolean(activeProjectId),
      hasBlueprint: Boolean(blueprint),
      hasChapterWorkspace: Boolean(
        blueprint?.status === 'confirmed' && !isEditingConfirmedBlueprint,
      ),
      hasDraftWorkspace: Boolean(selectedRevision),
      hasAdaptationSource: Boolean(projectOverview && projectOverview.finalizedChapterCount > 0),
    });
  }, [activeProjectId, blueprint, isEditingConfirmedBlueprint, projectOverview, selectedRevision]);

  useEffect(
    () => () => {
      publishProjectNavigationState(emptyProjectNavigationState);
    },
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8">
      <header className="flex flex-col gap-3 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpenText className="size-4" />
            瀚霖创作引擎
          </div>
          <h1 className="mt-2 text-3xl font-semibold">作品库</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            查看已有作品与生成状态，或创建一个新故事。所有生成任务由后台运行时执行。
          </p>
        </div>
        {job && <Badge variant={statusVariant(job.status)}>{statusLabel(job.status)}</Badge>}
      </header>

      {!isProjectSetupStarted && (
        <section
          id="story-setup"
          className="grid gap-5 border-b border-primary/20 bg-primary/[0.035] px-5 py-6 scroll-mt-6 sm:px-7"
          aria-labelledby="project-entry-heading"
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <FileText className="size-4" />
              新建作品
            </div>
            <h2 id="project-entry-heading" className="mt-3 text-2xl font-semibold tracking-normal">
              从一个项目开始
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              先为作品命名。题材、篇幅和故事设定可以在下一步慢慢补全。
            </p>
          </div>
          <div className="flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="title">项目名称</Label>
              <Input
                id="title"
                value={project.title}
                onChange={(event) => updateProject('title', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    startProjectSetup();
                  }
                }}
                placeholder="例如：雾港来信"
                maxLength={120}
                autoComplete="off"
              />
            </div>
            <Button type="button" className="mt-auto sm:shrink-0" onClick={startProjectSetup}>
              建立项目
              <ArrowRight />
            </Button>
          </div>
          {error && (
            <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
              <CircleAlert className="size-4 shrink-0" />
              {error}
            </p>
          )}
        </section>
      )}

      <section
        id="project-library"
        className="grid gap-4 border-b pb-7 scroll-mt-6"
        aria-labelledby="project-library-heading"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="size-4 text-primary" />
          <h2 id="project-library-heading" className="text-base font-semibold">
            你的作品
          </h2>
        </div>

        {isLoadingProjects && (
          <div className="grid gap-3" aria-label="正在加载作品库">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {libraryError && !isLoadingProjects && (
          <div
            className="flex items-center justify-between gap-4 text-sm text-destructive"
            role="alert"
          >
            <span>{libraryError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadProjects()}>
              重试
            </Button>
          </div>
        )}

        {!isLoadingProjects && !libraryError && projects.length === 0 && (
          <p className="text-sm text-muted-foreground">
            还没有作品。创建第一个故事后，它会保存在这里。
          </p>
        )}

        {!isLoadingProjects && projects.length > 0 && (
          <div className="grid gap-3">
            <ul className="grid gap-3">
              {projects.map((item) => {
                const latestRun = item.latestRun;
                return (
                  <li
                    key={item.id}
                    className="grid gap-3 border px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{item.title}</p>
                        <Badge variant={latestRun ? statusVariant(latestRun.status) : 'outline'}>
                          {latestRun ? statusLabel(latestRun.status) : '未生成'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.genre} · {item.chapterCount} 章 · 每章 {item.targetWordsPerChapter} 字
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        已定稿 {item.finalizedChapterCount} 章 · 确认事实 {item.confirmedFactCount}{' '}
                        ·{' '}
                        {item.blockingFindingCount > 0
                          ? `阻断问题 ${item.blockingFindingCount}`
                          : '无阻断问题'}
                      </p>
                      {latestRun && (
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <Progress
                            value={latestRun.progress}
                            className="h-1.5 w-24"
                            aria-label={`${item.title} 生成进度`}
                          />
                          <span>{latestRun.progress}%</span>
                          <span className="truncate">{latestRun.currentStep}</span>
                        </div>
                      )}

                      {activeProjectId === item.id && (
                        <section
                          id="adaptation-workspace"
                          className="grid gap-5 border-b pt-2 pb-7 scroll-mt-6"
                          aria-labelledby="adaptation-heading"
                        >
                          <div className="flex items-start gap-3">
                            <Clapperboard className="mt-0.5 size-5 shrink-0 text-primary" />
                            <div>
                              <h2 id="adaptation-heading" className="text-base font-semibold">
                                小说转剧本
                              </h2>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                创建时会锁定当前已定稿章节的内容与版本；后续修改小说不会覆盖已建立的改编来源。
                              </p>
                            </div>
                          </div>

                          {projectOverview?.finalizedChapterCount ? (
                            <form className="grid gap-4" onSubmit={saveAdaptationBrief}>
                              <div className="grid gap-4 sm:grid-cols-3">
                                <div className="grid gap-2">
                                  <Label htmlFor="adaptation-format">改编形态</Label>
                                  <Select
                                    value={adaptationDraft.targetFormat}
                                    onValueChange={(value) =>
                                      setAdaptationDraft((current) => ({
                                        ...current,
                                        targetFormat: value as AdaptationDraft['targetFormat'],
                                      }))
                                    }
                                    disabled={!isAdaptationBriefEditable}
                                  >
                                    <SelectTrigger id="adaptation-format" className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                      <SelectItem value="series">剧集</SelectItem>
                                      <SelectItem value="short_drama">短剧</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="adaptation-episodes">集数</Label>
                                  <Input
                                    id="adaptation-episodes"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={adaptationDraft.episodeCount}
                                    onChange={(event) =>
                                      setAdaptationDraft((current) => ({
                                        ...current,
                                        episodeCount: Number(event.target.value),
                                      }))
                                    }
                                    required
                                    disabled={!isAdaptationBriefEditable}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="adaptation-minutes">每集分钟数</Label>
                                  <Input
                                    id="adaptation-minutes"
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={adaptationDraft.minutesPerEpisode}
                                    onChange={(event) =>
                                      setAdaptationDraft((current) => ({
                                        ...current,
                                        minutesPerEpisode: Number(event.target.value),
                                      }))
                                    }
                                    required
                                    disabled={!isAdaptationBriefEditable}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label htmlFor="adaptation-audience">目标观众</Label>
                                  <Input
                                    id="adaptation-audience"
                                    value={adaptationDraft.targetAudience}
                                    onChange={(event) =>
                                      setAdaptationDraft((current) => ({
                                        ...current,
                                        targetAudience: event.target.value,
                                      }))
                                    }
                                    maxLength={500}
                                    disabled={!isAdaptationBriefEditable}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="adaptation-goal">改编目标</Label>
                                  <Input
                                    id="adaptation-goal"
                                    value={adaptationDraft.adaptationGoal}
                                    onChange={(event) =>
                                      setAdaptationDraft((current) => ({
                                        ...current,
                                        adaptationGoal: event.target.value,
                                      }))
                                    }
                                    maxLength={10000}
                                    disabled={!isAdaptationBriefEditable}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="adaptation-preserve">必须保留</Label>
                                <Textarea
                                  id="adaptation-preserve"
                                  value={adaptationDraft.mustPreserve}
                                  onChange={(event) =>
                                    setAdaptationDraft((current) => ({
                                      ...current,
                                      mustPreserve: event.target.value,
                                    }))
                                  }
                                  className="min-h-20 resize-y"
                                  maxLength={10000}
                                  disabled={!isAdaptationBriefEditable}
                                  placeholder="例如：保留主角动机、世界观规则与终局反转。"
                                />
                              </div>
                              {!selectedAdaptation && (
                                <label className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={adaptationDraft.rightsConfirmed}
                                    onChange={(event) =>
                                      setAdaptationDraft((current) => ({
                                        ...current,
                                        rightsConfirmed: event.target.checked,
                                      }))
                                    }
                                    className="mt-0.5 size-4 accent-primary"
                                  />
                                  <span>我确认拥有该小说用于本次改编创作的必要权利。</span>
                                </label>
                              )}
                              {adaptationError && (
                                <p className="text-sm text-destructive" role="alert">
                                  {adaptationError}
                                </p>
                              )}
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  type="submit"
                                  disabled={
                                    isCreatingAdaptation ||
                                    isSavingAdaptationBrief ||
                                    !isAdaptationBriefEditable ||
                                    (!selectedAdaptation && !adaptationDraft.rightsConfirmed)
                                  }
                                >
                                  {isCreatingAdaptation || isSavingAdaptationBrief ? (
                                    <LoaderCircle className="animate-spin" />
                                  ) : (
                                    <Clapperboard />
                                  )}
                                  {selectedAdaptation ? '保存简报' : '创建改编项目'}
                                </Button>
                                {selectedAdaptation?.status === 'brief_draft' && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isConfirmingAdaptationBrief}
                                    onClick={() => void confirmAdaptationBrief()}
                                  >
                                    {isConfirmingAdaptationBrief ? (
                                      <LoaderCircle className="animate-spin" />
                                    ) : (
                                      <Check />
                                    )}
                                    确认简报并进入蓝图审阅
                                  </Button>
                                )}
                              </div>
                            </form>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              至少定稿一章小说后，即可建立可追溯的改编来源快照。
                            </p>
                          )}

                          {isLoadingAdaptations && <Skeleton className="h-16 w-full" />}
                          {!isLoadingAdaptations && adaptations.length > 0 && (
                            <ul className="grid gap-2">
                              {adaptations.map((adaptation) => (
                                <li
                                  key={adaptation.id}
                                  className="flex flex-wrap items-center justify-between gap-3 border px-4 py-3 text-sm"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {adaptation.targetFormat === 'series'
                                        ? '剧集改编'
                                        : '短剧改编'}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {adaptation.episodeCount} 集 · 每集{' '}
                                      {adaptation.minutesPerEpisode} 分钟 · 锁定{' '}
                                      {adaptation.sourceSnapshot.sourceChapterCount} 章来源
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {adaptation.status === 'brief_draft'
                                        ? '简报草稿'
                                        : '待蓝图审阅'}
                                    </Badge>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => selectAdaptation(adaptation)}
                                    >
                                      {adaptation.status === 'brief_draft'
                                        ? '编辑简报'
                                        : '查看简报'}
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={openingRunId === item.id}
                      onClick={() => void openProject(item)}
                    >
                      {openingRunId === item.id ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <FolderOpen />
                      )}
                      {latestRun ? '打开作品' : '继续创作'}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {projects.length < projectTotal && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  已显示 {projects.length} / {projectTotal} 部作品
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoadingMoreProjects}
                  onClick={() => void loadProjects(projectPage + 1, true)}
                >
                  {isLoadingMoreProjects ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <FolderOpen />
                  )}
                  加载更多作品
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {isProjectSetupStarted && (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form id="project-details" onSubmit={submit} className="grid gap-6 scroll-mt-6">
            <section
              id="legacy-import"
              className="grid gap-4 border-b pb-7 scroll-mt-6"
              aria-labelledby="legacy-import-heading"
            >
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <h2 id="legacy-import-heading" className="text-base font-semibold">
                  导入旧作品
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  aria-label="选择旧作品文件"
                  type="file"
                  accept=".txt,.md,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  disabled={isPreviewingImport || isConfirmingImport}
                  onChange={(event) => void previewProjectImport(event)}
                />
                {isPreviewingImport && (
                  <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {importError && (
                <p className="text-sm text-destructive" role="alert">
                  {importError}
                </p>
              )}
              {importPreview && (
                <div className="grid gap-3 border-l-2 border-primary/40 pl-4">
                  <p className="text-sm">
                    已解析 {importPreview.chapters.length} 章，原始文件校验已保存。
                  </p>
                  <ul className="grid gap-1 text-xs text-muted-foreground">
                    {importPreview.chapters.slice(0, 5).map((chapter) => (
                      <li key={chapter.chapterNumber}>
                        第 {chapter.chapterNumber} 章 · {chapter.title} · {chapter.characterCount}{' '}
                        字符
                      </li>
                    ))}
                    {importPreview.chapters.length > 5 && (
                      <li>其余 {importPreview.chapters.length - 5} 章将在确认后迁移。</li>
                    )}
                  </ul>
                  {importPreview.factCandidates.length > 0 && (
                    <fieldset className="grid gap-2 border-l-2 border-amber-500/40 pl-3">
                      <legend className="text-sm font-medium">导入事实候选（默认不写入）</legend>
                      <p className="text-xs text-muted-foreground">
                        仅勾选你确认无误的候选；未勾选内容会随原稿导入，但不会成为作品设定。
                      </p>
                      {importPreview.factCandidates.map((candidate) => {
                        const checked = acceptedImportFactCandidateIds.includes(candidate.id);
                        return (
                          <label key={candidate.id} className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setAcceptedImportFactCandidateIds((current) =>
                                  checked
                                    ? current.filter((id) => id !== candidate.id)
                                    : [...current, candidate.id],
                                )
                              }
                            />
                            <span>
                              第 {candidate.chapterNumber} 章 · {candidate.subject} /{' '}
                              {candidate.predicate} / {candidate.value}
                              <span className="block text-xs text-muted-foreground">
                                证据：{candidate.evidence}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </fieldset>
                  )}
                  <div>
                    <Button
                      type="button"
                      onClick={() => void confirmProjectImport()}
                      disabled={isConfirmingImport}
                    >
                      {isConfirmingImport ? <LoaderCircle className="animate-spin" /> : <Check />}
                      确认迁移旧作品
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <section className="grid gap-5 border-b pb-7">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <h2 className="text-base font-semibold">补全故事设定</h2>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-primary/40 bg-muted/40 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">当前项目</p>
                  <p className="mt-0.5 font-medium">{project.title}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProjectSetupStarted(false)}
                >
                  修改名称
                </Button>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="format">创作类型</Label>
                  <Select value={project.format} disabled>
                    <SelectTrigger id="format" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="novel">小说</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="genre">题材</Label>
                  <Select
                    value={project.genre}
                    onValueChange={(value) => updateProject('genre', value)}
                  >
                    <SelectTrigger id="genre" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {studioGenres.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="chapters">章节数量</Label>
                  <Input
                    id="chapters"
                    type="number"
                    min={1}
                    max={500}
                    value={project.chapterCount}
                    onChange={(event) => updateProject('chapterCount', Number(event.target.value))}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label id="premise-label">故事梗概</Label>
                <StoryPremiseEditor
                  value={project.premise}
                  onChange={(value) => updateProject('premise', value)}
                />
                <p className="text-xs text-muted-foreground">
                  支持基础排版；至少 20 个字符，越具体越利于保持长篇一致性。
                </p>
              </div>
            </section>

            <section className="grid gap-5 border-b pb-7">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="text-base font-semibold">生成策略</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="word-count">每章目标字数</Label>
                  <Input
                    id="word-count"
                    type="number"
                    min={500}
                    max={20000}
                    value={project.targetWordsPerChapter}
                    onChange={(event) =>
                      updateProject('targetWordsPerChapter', Number(event.target.value))
                    }
                    required
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-3 self-end rounded-md border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={project.generateOutline}
                    onChange={(event) => updateProject('generateOutline', event.target.checked)}
                    className="size-4 accent-primary"
                  />
                  同时生成章节蓝图
                </label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guidance">创作偏好</Label>
                <Textarea
                  id="guidance"
                  value={project.guidance}
                  onChange={(event) => updateProject('guidance', event.target.value)}
                  placeholder="例如：保持冷峻克制的叙述，感情线缓慢推进，避免超自然设定。"
                  className="min-h-24 resize-y"
                  maxLength={2000}
                />
              </div>
            </section>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive" role="alert">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || Boolean(job && !terminalStatuses.has(job.status))}
              >
                {isSubmitting || job?.status === 'running' ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                {job && !terminalStatuses.has(job.status) ? '正在生成' : '生成故事架构'}
              </Button>
            </div>
          </form>

          <aside id="task-center" className="border-l pl-0 lg:pl-8 scroll-mt-6">
            <div className="grid gap-5">
              <div>
                <p className="text-sm font-semibold">运行状态</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {job ? job.currentStep : '填写故事设定后，生成任务会出现在这里。'}
                </p>
                {job?.error && (
                  <p className="mt-2 text-xs text-destructive">最近错误：{job.error}</p>
                )}
                {job && (
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <Progress
                      value={job.progress}
                      className="h-1.5 flex-1"
                      aria-label="当前任务进度"
                    />
                    <span>{job.progress}%</span>
                  </div>
                )}
              </div>
              {job && !terminalStatuses.has(job.status) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isCancellingJob}
                  onClick={() => void cancelJob()}
                >
                  {isCancellingJob ? <LoaderCircle className="animate-spin" /> : <CircleAlert />}
                  取消生成
                </Button>
              )}
              {job && (job.status === 'failed' || job.status === 'cancelled') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isRetryingJob}
                  onClick={() => void retryJob()}
                >
                  {isRetryingJob ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                  重新开始生成
                </Button>
              )}

              {activeProjectId && (
                <section
                  id="project-overview"
                  className="grid gap-4 border-t pt-5 scroll-mt-6"
                  aria-labelledby="project-status-heading"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p id="project-status-heading" className="text-sm font-semibold">
                        作品状态
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        定稿、事实与后台处理进度。
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadProjectStatus(activeProjectId)}
                      aria-label="刷新作品状态"
                    >
                      <RefreshCw />
                    </Button>
                  </div>
                  {workspaceStatusError && (
                    <p className="text-xs text-destructive">{workspaceStatusError}</p>
                  )}
                  {projectOverview && (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">已定稿</dt>
                        <dd className="mt-1 font-medium">
                          {projectOverview.finalizedChapterCount} 章
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">确认事实</dt>
                        <dd className="mt-1 font-medium">{projectOverview.confirmedFactCount}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">待裁决建议</dt>
                        <dd className="mt-1 font-medium">
                          {projectOverview.pendingFactChangeCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">阻断问题</dt>
                        <dd className="mt-1 font-medium">{projectOverview.blockingFindingCount}</dd>
                      </div>
                    </dl>
                  )}
                  {projectOverview && projectOverview.pendingChapterReviewNumbers.length > 0 && (
                    <div className="grid gap-2 border-t pt-3" role="status">
                      <p className="text-xs font-medium text-destructive">
                        {projectOverview.pendingChapterReviewNumbers.length} 个章节计划需要复核
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setChapterNumber(projectOverview.pendingChapterReviewNumbers[0] ?? 1)
                        }
                      >
                        复核第 {projectOverview.pendingChapterReviewNumbers[0]} 章
                      </Button>
                    </div>
                  )}
                  {finalizationTasks.length > 0 && (
                    <div className="grid gap-2 border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground">定稿后台任务</p>
                      {finalizationTasks.map((task) => (
                        <div
                          key={task.id}
                          className="grid gap-2 border-b pb-3 text-xs last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              第 {task.chapterNumber} 章 ·{' '}
                              {task.type === 'summary' ? '摘要' : '索引'}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  task.status === 'failed'
                                    ? 'destructive'
                                    : task.status === 'completed'
                                      ? 'default'
                                      : 'secondary'
                                }
                              >
                                {
                                  {
                                    pending: '等待',
                                    running: '处理中',
                                    completed: '完成',
                                    failed: '失败',
                                    recoverable: '可恢复',
                                  }[task.status]
                                }
                              </Badge>
                              {(task.status === 'failed' || task.status === 'recoverable') && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={retryingFinalizationTaskId === task.id}
                                  onClick={() => void retryFinalizationTask(task)}
                                >
                                  {retryingFinalizationTaskId === task.id ? (
                                    <LoaderCircle className="animate-spin" />
                                  ) : (
                                    <RefreshCw />
                                  )}
                                  重试
                                </Button>
                              )}
                            </div>
                          </div>
                          {(task.status === 'failed' || task.status === 'recoverable') && (
                            <div
                              className="grid gap-1 text-muted-foreground"
                              role="status"
                              aria-live="polite"
                            >
                              <p>
                                正文和事实裁决已保存；{task.type === 'summary' ? '摘要' : '索引'}
                                尚未完成。
                              </p>
                              {task.lastError && <p>最近错误：{task.lastError}</p>}
                              <p>可从该任务的保存进度继续，重试不会重复定稿。</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <section id="version-export" className="grid gap-2 border-t pt-3 scroll-mt-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      格式
                      <Select
                        value={exportFormat}
                        onValueChange={(value) => setExportFormat(value as 'md' | 'txt')}
                      >
                        <SelectTrigger aria-label="导出格式" size="sm" className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="md">Markdown (.md)</SelectItem>
                          <SelectItem value="txt">纯文本 (.txt)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={forceExport}
                        onChange={(event) => setForceExport(event.target.checked)}
                        className="size-4 accent-primary"
                      />
                      带未处理阻断问题导出
                    </label>
                    {forceExport && (
                      <Input
                        aria-label="强制导出原因"
                        value={forceExportReason}
                        maxLength={2000}
                        onChange={(event) => setForceExportReason(event.target.value)}
                        placeholder="填写导出原因"
                      />
                    )}
                    {exportError && <p className="text-xs text-destructive">{exportError}</p>}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void exportProject()}
                      disabled={isExporting}
                    >
                      {isExporting ? <LoaderCircle className="animate-spin" /> : <Download />}
                      导出当前定稿
                    </Button>
                  </section>
                </section>
              )}

              {blueprint && (
                <section
                  id="blueprint-workspace"
                  className="grid gap-4 border-t pt-5 scroll-mt-6"
                  aria-labelledby="blueprint-heading"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p id="blueprint-heading" className="text-sm font-semibold">
                        创作蓝图
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">版本 {blueprint.version}</p>
                    </div>
                    <Badge variant={blueprint.status === 'confirmed' ? 'default' : 'secondary'}>
                      {blueprint.status === 'confirmed' ? '已确认' : '待确认'}
                    </Badge>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="blueprint-architecture">故事架构</Label>
                    <Textarea
                      id="blueprint-architecture"
                      value={blueprint.architecture}
                      disabled={
                        (blueprint.status === 'confirmed' && !isEditingConfirmedBlueprint) ||
                        isSavingBlueprint
                      }
                      onChange={(event) =>
                        setBlueprint((current) =>
                          current ? { ...current, architecture: event.target.value } : current,
                        )
                      }
                      className="min-h-36 resize-y"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="blueprint-outline">章节目录</Label>
                    <Textarea
                      id="blueprint-outline"
                      value={blueprint.outline}
                      disabled={
                        (blueprint.status === 'confirmed' && !isEditingConfirmedBlueprint) ||
                        isSavingBlueprint
                      }
                      onChange={(event) =>
                        setBlueprint((current) =>
                          current ? { ...current, outline: event.target.value } : current,
                        )
                      }
                      className="min-h-28 resize-y"
                    />
                  </div>

                  {blueprintError && <p className="text-sm text-destructive">{blueprintError}</p>}
                  {blueprintRestoreNotice && (
                    <p className="text-sm text-muted-foreground" role="status">
                      {blueprintRestoreNotice}
                    </p>
                  )}

                  {blueprintHistory.length > 1 && (
                    <div className="grid gap-2 border-t pt-4">
                      <p className="text-sm font-semibold">蓝图历史</p>
                      {blueprintHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span>
                            蓝图 v{item.version} · {item.status === 'confirmed' ? '已确认' : '草稿'}
                          </span>
                          {item.id === blueprint.id ? (
                            <Badge variant="secondary">当前</Badge>
                          ) : item.status === 'confirmed' ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={restoringBlueprintId === item.id}
                              onClick={() => void restoreBlueprint(item)}
                            >
                              {restoringBlueprintId === item.id ? (
                                <LoaderCircle className="animate-spin" />
                              ) : (
                                <RefreshCw />
                              )}
                              恢复此版本
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  {blueprint.status === 'confirmed' && !isEditingConfirmedBlueprint && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingConfirmedBlueprint(true)}
                    >
                      <FileText />
                      创建修订版
                    </Button>
                  )}

                  {(blueprint.status === 'draft' || isEditingConfirmedBlueprint) && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void saveBlueprint()}
                        disabled={isSavingBlueprint}
                      >
                        {isSavingBlueprint ? <LoaderCircle className="animate-spin" /> : <Save />}
                        保存蓝图
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void confirmBlueprint()}
                        disabled={isSavingBlueprint}
                      >
                        <Check />
                        确认蓝图
                      </Button>
                    </div>
                  )}
                </section>
              )}

              {blueprint?.status === 'confirmed' && !isEditingConfirmedBlueprint && (
                <section
                  id="chapter-workspace"
                  className="grid gap-4 border-t pt-5 scroll-mt-6"
                  aria-labelledby="chapter-plan-heading"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p id="chapter-plan-heading" className="text-sm font-semibold">
                        章节计划
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">草稿生成前必须确认</p>
                    </div>
                    {chapterPlan && (
                      <Badge
                        variant={
                          chapterPlan.needsReview
                            ? 'destructive'
                            : chapterPlan.status === 'confirmed'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {chapterPlan.needsReview
                          ? '待复核'
                          : chapterPlan.status === 'confirmed'
                            ? '已确认'
                            : '待确认'}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="chapter-number">章节</Label>
                    <Input
                      id="chapter-number"
                      type="number"
                      min={1}
                      max={project.chapterCount}
                      value={chapterNumber}
                      onChange={(event) => setChapterNumber(Number(event.target.value) || 1)}
                      disabled={isSavingChapterPlan}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="chapter-title">章节标题</Label>
                    <Input
                      id="chapter-title"
                      value={chapterPlanDraft.title}
                      disabled={
                        (chapterPlan?.status === 'confirmed' && !isEditingConfirmedChapterPlan) ||
                        isSavingChapterPlan
                      }
                      onChange={(event) =>
                        setChapterPlanDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="chapter-goal">本章目标</Label>
                    <Textarea
                      id="chapter-goal"
                      value={chapterPlanDraft.goal}
                      disabled={
                        (chapterPlan?.status === 'confirmed' && !isEditingConfirmedChapterPlan) ||
                        isSavingChapterPlan
                      }
                      onChange={(event) =>
                        setChapterPlanDraft((current) => ({
                          ...current,
                          goal: event.target.value,
                        }))
                      }
                      className="min-h-24 resize-y"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="chapter-conflict">核心冲突</Label>
                    <Textarea
                      id="chapter-conflict"
                      value={chapterPlanDraft.conflict}
                      disabled={
                        (chapterPlan?.status === 'confirmed' && !isEditingConfirmedChapterPlan) ||
                        isSavingChapterPlan
                      }
                      onChange={(event) =>
                        setChapterPlanDraft((current) => ({
                          ...current,
                          conflict: event.target.value,
                        }))
                      }
                      className="min-h-20 resize-y"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="chapter-characters">出场人物</Label>
                    <Input
                      id="chapter-characters"
                      value={chapterPlanDraft.characters.join('，')}
                      disabled={
                        (chapterPlan?.status === 'confirmed' && !isEditingConfirmedChapterPlan) ||
                        isSavingChapterPlan
                      }
                      onChange={(event) =>
                        setChapterPlanDraft((current) => ({
                          ...current,
                          characters: event.target.value
                            .split(/[，,]/)
                            .map((value) => value.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="chapter-location">地点</Label>
                      <Input
                        id="chapter-location"
                        value={chapterPlanDraft.location}
                        disabled={
                          (chapterPlan?.status === 'confirmed' && !isEditingConfirmedChapterPlan) ||
                          isSavingChapterPlan
                        }
                        onChange={(event) =>
                          setChapterPlanDraft((current) => ({
                            ...current,
                            location: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="chapter-time">时间约束</Label>
                      <Input
                        id="chapter-time"
                        value={chapterPlanDraft.timeConstraint}
                        disabled={
                          (chapterPlan?.status === 'confirmed' && !isEditingConfirmedChapterPlan) ||
                          isSavingChapterPlan
                        }
                        onChange={(event) =>
                          setChapterPlanDraft((current) => ({
                            ...current,
                            timeConstraint: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="chapter-hook">章节钩子</Label>
                    <Textarea
                      id="chapter-hook"
                      value={chapterPlanDraft.hook}
                      disabled={
                        (chapterPlan?.status === 'confirmed' && !isEditingConfirmedChapterPlan) ||
                        isSavingChapterPlan
                      }
                      onChange={(event) =>
                        setChapterPlanDraft((current) => ({
                          ...current,
                          hook: event.target.value,
                        }))
                      }
                      className="min-h-20 resize-y"
                    />
                  </div>

                  {chapterPlanError && (
                    <p className="text-sm text-destructive">{chapterPlanError}</p>
                  )}
                  {chapterPlan?.needsReview && (
                    <p className="text-sm text-destructive" role="alert">
                      蓝图已恢复到其他版本。请检查本章计划后重新确认，才能继续生成草稿。
                    </p>
                  )}

                  {chapterPlan?.status === 'confirmed' && !isEditingConfirmedChapterPlan && (
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="draft-prompt">本次附加要求</Label>
                        <Textarea
                          id="draft-prompt"
                          value={draftPrompt}
                          onChange={(event) => setDraftPrompt(event.target.value)}
                          disabled={isGeneratingChapterDraft || chapterPlan.needsReview}
                          maxLength={2000}
                          className="min-h-20 resize-y"
                          placeholder="例如：开场先写雨声，保持克制的心理描写。"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingConfirmedChapterPlan(true)}
                          disabled={isGeneratingChapterDraft}
                        >
                          <FileText />
                          创建修订版
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void createChapterDraft()}
                          disabled={isGeneratingChapterDraft || chapterPlan.needsReview}
                        >
                          {isGeneratingChapterDraft ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Sparkles />
                          )}
                          生成本章草稿
                        </Button>
                      </div>
                    </div>
                  )}

                  {(chapterPlan?.status !== 'confirmed' ||
                    chapterPlan?.needsReview ||
                    isEditingConfirmedChapterPlan) && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void saveChapterPlan()}
                        disabled={isSavingChapterPlan}
                      >
                        {isSavingChapterPlan ? <LoaderCircle className="animate-spin" /> : <Save />}
                        保存计划
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void confirmChapterPlan()}
                        disabled={
                          isSavingChapterPlan ||
                          !chapterPlan ||
                          (chapterPlan.status === 'confirmed' && !chapterPlan.needsReview)
                        }
                      >
                        <Check />
                        确认计划
                      </Button>
                    </div>
                  )}

                  {chapterRevisions.length > 0 && (
                    <div className="grid gap-3 border-t pt-4">
                      <div>
                        <p className="text-sm font-semibold">草稿版本</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          恢复只会切换当前草稿，不会改写历史正文。
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {chapterRevisions.map((revision) => (
                          <div
                            key={revision.id}
                            className="flex items-center justify-between gap-2 border px-3 py-2"
                          >
                            <button
                              type="button"
                              className="min-w-0 text-left text-sm"
                              onClick={() => {
                                setSelectedRevision(revision);
                                setComparisonRevisionId((current) =>
                                  current === revision.id
                                    ? (chapterRevisions.find(
                                        (candidate) => candidate.id !== revision.id,
                                      )?.id ?? null)
                                    : current,
                                );
                              }}
                            >
                              <span className="font-medium">草稿 v{revision.version}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {revision.wordCount} 词
                              </span>
                            </button>
                            <div className="flex items-center gap-2">
                              {currentFinalRevisionId === revision.id && (
                                <Badge variant="default">已定稿</Badge>
                              )}
                              {currentRevisionId === revision.id ? (
                                <Badge variant="secondary">当前草稿</Badge>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isRestoringChapterDraft}
                                  onClick={() => void restoreChapterDraft(revision)}
                                >
                                  恢复
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {chapterFinalizations.length > 0 && (
                        <div className="grid gap-2 border-t pt-3">
                          <p className="text-sm font-semibold">终稿历史</p>
                          {chapterFinalizations.map((finalization) => (
                            <div
                              key={finalization.id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span>
                                终稿版本{' '}
                                {chapterRevisions.find(
                                  (revision) => revision.id === finalization.revisionId,
                                )?.version ?? '历史'}
                              </span>
                              {finalization.revisionId === currentFinalRevisionId ? (
                                <Badge variant="default">当前定稿</Badge>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={restoringFinalRevisionId === finalization.revisionId}
                                  onClick={() => void restoreFinalRevision(finalization)}
                                >
                                  {restoringFinalRevisionId === finalization.revisionId ? (
                                    <LoaderCircle className="animate-spin" />
                                  ) : (
                                    <RefreshCw />
                                  )}
                                  恢复终稿
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedRevision && (
                        <div className="grid gap-2">
                          <Label htmlFor="selected-chapter-draft">
                            草稿 v{selectedRevision.version} 正文
                          </Label>
                          <Textarea
                            id="selected-chapter-draft"
                            value={revisionContent}
                            readOnly={!canEditSelectedRevision}
                            aria-readonly={!canEditSelectedRevision}
                            className="min-h-64 resize-y text-sm leading-6"
                            onChange={(event) => {
                              setRevisionContent(event.target.value);
                              setHasUnsavedRevisionChanges(true);
                              setRevisionSaveState('idle');
                            }}
                          />
                          {canEditSelectedRevision ? (
                            <>
                              <Label htmlFor="chapter-revision-summary">本次编辑摘要</Label>
                              <Input
                                id="chapter-revision-summary"
                                value={revisionEditSummary}
                                maxLength={2000}
                                onChange={(event) => {
                                  setRevisionEditSummary(event.target.value);
                                  setHasUnsavedRevisionChanges(true);
                                  setRevisionSaveState('idle');
                                }}
                              />
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {revisionSaveState === 'saving' && <span>正在保存新版本...</span>}
                                {revisionSaveState === 'saved' && revisionLastSavedAt && (
                                  <span>已保存 {revisionLastSavedAt.toLocaleTimeString()}</span>
                                )}
                                {revisionSaveState === 'failed' && (
                                  <>
                                    <span className="text-destructive">
                                      保存失败，编辑内容仍保留在此页面。
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => void saveAuthorRevision()}
                                    >
                                      <Save />
                                      重试保存
                                    </Button>
                                  </>
                                )}
                                {revisionSaveState === 'idle' && hasUnsavedRevisionChanges && (
                                  <span>将在停止输入后自动保存。</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              请先恢复此版本为当前草稿后编辑；编辑已定稿内容会创建新的草稿版本。
                            </p>
                          )}
                        </div>
                      )}
                      {selectedRevision && (
                        <div
                          id="review-workspace"
                          className="grid gap-3 border-t pt-4"
                          aria-labelledby="review-findings-heading"
                        >
                          <div>
                            <p id="review-findings-heading" className="text-sm font-semibold">
                              硬事实审校
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              未处理的阻断问题会禁止章节定稿。
                            </p>
                          </div>
                          {reviewFindings.length === 0 && (
                            <p className="text-sm text-muted-foreground">当前版本没有审校问题。</p>
                          )}
                          {reviewFindings.map((finding) => (
                            <div
                              key={finding.id}
                              className="grid gap-2 border-l-2 border-destructive/60 pl-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={
                                    finding.status === 'open' && finding.severity === 'blocking'
                                      ? 'destructive'
                                      : 'outline'
                                  }
                                >
                                  {finding.status === 'open'
                                    ? '待处理'
                                    : finding.status === 'resolved'
                                      ? '已解决'
                                      : finding.status === 'ignored'
                                        ? '已忽略'
                                        : '已记录变更'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {finding.ruleId}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap">{finding.evidence}</p>
                              <p className="text-xs text-muted-foreground">
                                建议：{finding.suggestedAction}
                              </p>
                              {finding.status === 'open' && (
                                <>
                                  <Input
                                    aria-label={`审校处理理由 ${finding.id}`}
                                    value={reviewResolutionDrafts[finding.id]?.reason ?? ''}
                                    maxLength={2000}
                                    onChange={(event) => {
                                      setReviewResolutionDrafts((current) => ({
                                        ...current,
                                        [finding.id]: {
                                          reason: event.target.value,
                                          resolvedValue: current[finding.id]?.resolvedValue ?? '',
                                        },
                                      }));
                                    }}
                                    placeholder="填写处理理由"
                                  />
                                  <Input
                                    aria-label={`有意变更新事实值 ${finding.id}`}
                                    value={reviewResolutionDrafts[finding.id]?.resolvedValue ?? ''}
                                    maxLength={20000}
                                    onChange={(event) => {
                                      setReviewResolutionDrafts((current) => ({
                                        ...current,
                                        [finding.id]: {
                                          reason: current[finding.id]?.reason ?? '',
                                          resolvedValue: event.target.value,
                                        },
                                      }));
                                    }}
                                    placeholder="仅记录有意变更时填写新的事实值"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={
                                        resolvingReviewFindingId === finding.id ||
                                        !(reviewResolutionDrafts[finding.id]?.reason ?? '').trim()
                                      }
                                      onClick={() => void resolveReviewFinding(finding, 'resolve')}
                                    >
                                      解决
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={
                                        resolvingReviewFindingId === finding.id ||
                                        !(reviewResolutionDrafts[finding.id]?.reason ?? '').trim()
                                      }
                                      onClick={() => void resolveReviewFinding(finding, 'ignore')}
                                    >
                                      忽略
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={
                                        resolvingReviewFindingId === finding.id ||
                                        !(
                                          reviewResolutionDrafts[finding.id]?.reason ?? ''
                                        ).trim() ||
                                        !(
                                          reviewResolutionDrafts[finding.id]?.resolvedValue ?? ''
                                        ).trim()
                                      }
                                      onClick={() =>
                                        void resolveReviewFinding(finding, 'intentional_change')
                                      }
                                    >
                                      记录有意变更
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedRevision && comparisonRevisionId && (
                        <div className="grid gap-2">
                          <Label htmlFor="comparison-revision">与版本比较</Label>
                          <Select
                            value={comparisonRevisionId}
                            onValueChange={setComparisonRevisionId}
                          >
                            <SelectTrigger id="comparison-revision" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              {chapterRevisions
                                .filter((revision) => revision.id !== selectedRevision.id)
                                .map((revision) => (
                                  <SelectItem key={revision.id} value={revision.id}>
                                    草稿 v{revision.version}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {revisionDiff && (
                        <div className="grid gap-2">
                          <p className="text-sm font-semibold">版本差异</p>
                          <pre
                            aria-label="草稿版本差异"
                            className="max-h-80 overflow-auto whitespace-pre-wrap border p-3 text-sm leading-6"
                          >
                            {revisionDiff.segments.map((segment, index) => (
                              <span
                                key={`${segment.type}-${index}`}
                                className={
                                  segment.type === 'added'
                                    ? 'bg-emerald-100 text-emerald-950'
                                    : segment.type === 'removed'
                                      ? 'bg-rose-100 text-rose-950 line-through'
                                      : undefined
                                }
                              >
                                {segment.text}
                              </span>
                            ))}
                          </pre>
                        </div>
                      )}
                      {selectedRevision && (
                        <div id="facts-workspace" className="grid gap-3 border-t pt-4 scroll-mt-6">
                          <div>
                            <p className="text-sm font-semibold">事实建议</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              只有接受或编辑后接受的建议会写入确认事实层。
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="fact-operation">变更操作</Label>
                              <Select
                                value={factChangeDraft.operation}
                                onValueChange={(value) =>
                                  setFactChangeDraft((current) => ({
                                    ...current,
                                    operation: value as CreateStudioFactChange['operation'],
                                    factId: undefined,
                                    proposedValue: value === 'remove' ? '' : current.proposedValue,
                                  }))
                                }
                              >
                                <SelectTrigger id="fact-operation" className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  <SelectItem value="add">新增事实</SelectItem>
                                  <SelectItem value="update">更新事实</SelectItem>
                                  <SelectItem value="remove">移除事实</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {factChangeDraft.operation !== 'add' && (
                              <div className="grid gap-2">
                                <Label htmlFor="fact-target">目标确认事实</Label>
                                <Select
                                  value={factChangeDraft.factId ?? ''}
                                  onValueChange={(value) => {
                                    const fact = confirmedFacts.find((item) => item.id === value);
                                    setFactChangeDraft((current) => ({
                                      ...current,
                                      factId: fact?.id,
                                      factType: fact?.factType ?? current.factType,
                                      subject: fact?.subject ?? current.subject,
                                      predicate: fact?.predicate ?? current.predicate,
                                      proposedValue:
                                        current.operation === 'remove'
                                          ? ''
                                          : (fact?.value ?? current.proposedValue),
                                    }));
                                  }}
                                >
                                  <SelectTrigger id="fact-target" className="w-full">
                                    <SelectValue placeholder="请选择已确认事实" />
                                  </SelectTrigger>
                                  <SelectContent position="popper">
                                    {confirmedFacts.map((fact) => (
                                      <SelectItem key={fact.id} value={fact.id}>
                                        {fact.subject} · {fact.predicate}：{fact.value}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="grid gap-2">
                              <Label htmlFor="fact-type">事实类型</Label>
                              <Input
                                id="fact-type"
                                value={factChangeDraft.factType}
                                maxLength={80}
                                disabled={factChangeDraft.operation === 'remove'}
                                onChange={(event) =>
                                  setFactChangeDraft((current) => ({
                                    ...current,
                                    factType: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="fact-subject">主体</Label>
                              <Input
                                id="fact-subject"
                                value={factChangeDraft.subject}
                                maxLength={200}
                                disabled={factChangeDraft.operation === 'remove'}
                                onChange={(event) =>
                                  setFactChangeDraft((current) => ({
                                    ...current,
                                    subject: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="fact-predicate">关系或属性</Label>
                            <Input
                              id="fact-predicate"
                              value={factChangeDraft.predicate}
                              maxLength={200}
                              disabled={factChangeDraft.operation === 'remove'}
                              onChange={(event) =>
                                setFactChangeDraft((current) => ({
                                  ...current,
                                  predicate: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="fact-value">
                              {factChangeDraft.operation === 'remove' ? '移除目标' : '建议事实值'}
                            </Label>
                            <Textarea
                              id="fact-value"
                              value={factChangeDraft.proposedValue}
                              maxLength={20000}
                              className="min-h-20 resize-y"
                              disabled={factChangeDraft.operation === 'remove'}
                              onChange={(event) =>
                                setFactChangeDraft((current) => ({
                                  ...current,
                                  proposedValue: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="fact-evidence">正文证据</Label>
                            <Textarea
                              id="fact-evidence"
                              value={factChangeDraft.evidence}
                              maxLength={10000}
                              className="min-h-16 resize-y"
                              onChange={(event) =>
                                setFactChangeDraft((current) => ({
                                  ...current,
                                  evidence: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              isSavingFactChange ||
                              (factChangeDraft.operation !== 'add' && !factChangeDraft.factId) ||
                              !factChangeDraft.factType ||
                              !factChangeDraft.subject ||
                              !factChangeDraft.predicate ||
                              (factChangeDraft.operation !== 'remove' &&
                                !factChangeDraft.proposedValue)
                            }
                            onClick={() => void createFactChange()}
                          >
                            {isSavingFactChange ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <Sparkles />
                            )}
                            提交事实建议
                          </Button>
                          {factChanges.map((change) => (
                            <div key={change.id} className="grid gap-2 border p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium">
                                  {change.operation === 'add'
                                    ? '新增'
                                    : change.operation === 'update'
                                      ? '更新'
                                      : '移除'}
                                  ：{change.subject} · {change.predicate}
                                </p>
                                <Badge
                                  variant={
                                    change.status === 'accepted'
                                      ? 'default'
                                      : change.status === 'rejected'
                                        ? 'destructive'
                                        : 'secondary'
                                  }
                                >
                                  {change.status === 'accepted'
                                    ? '已生效'
                                    : change.status === 'accepted_pending_finalization'
                                      ? '待定稿生效'
                                      : change.status === 'rejected'
                                        ? '已拒绝'
                                        : '待裁决'}
                                </Badge>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-6">
                                {change.proposedValue}
                              </p>
                              {change.evidence && (
                                <p className="text-xs text-muted-foreground">
                                  证据：{change.evidence}
                                </p>
                              )}
                              {typeof change.confidence === 'number' && (
                                <p className="text-xs text-muted-foreground">
                                  证据置信度：{Math.round(change.confidence * 100)}%
                                </p>
                              )}
                              {change.status === 'proposed' && (
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={resolvingFactChangeId === change.id}
                                    onClick={() => void resolveFactChange(change, 'accept')}
                                  >
                                    <Check />
                                    接受
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={resolvingFactChangeId === change.id}
                                    onClick={() => {
                                      setEditingFactChangeId(change.id);
                                      setEditedFactValue(change.proposedValue);
                                    }}
                                  >
                                    编辑后接受
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={resolvingFactChangeId === change.id}
                                    onClick={() => void resolveFactChange(change, 'reject')}
                                  >
                                    拒绝
                                  </Button>
                                </div>
                              )}
                              {editingFactChangeId === change.id && (
                                <div className="grid gap-2">
                                  <Label htmlFor={`fact-edit-${change.id}`}>确认事实值</Label>
                                  <Textarea
                                    id={`fact-edit-${change.id}`}
                                    value={editedFactValue}
                                    className="min-h-20 resize-y"
                                    onChange={(event) => setEditedFactValue(event.target.value)}
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                      resolvingFactChangeId === change.id || !editedFactValue.trim()
                                    }
                                    onClick={() => void resolveFactChange(change, 'edit')}
                                  >
                                    确认编辑
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="grid gap-2 border-t pt-3">
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                isFinalizingChapter ||
                                !selectedRevision ||
                                selectedRevision.status !== 'draft' ||
                                selectedRevision.id !== currentRevisionId ||
                                pendingFactChanges
                              }
                              onClick={() => void finalizeChapterDraft()}
                            >
                              {isFinalizingChapter ? (
                                <LoaderCircle className="animate-spin" />
                              ) : (
                                <Check />
                              )}
                              确认并定稿
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              {finalizationBlockedReason}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              <Progress value={job?.progress ?? 0} className="h-2" aria-label="生成进度" />
              <p className="text-sm tabular-nums text-muted-foreground">{job?.progress ?? 0}%</p>

              {job?.artifact && (
                <div className="grid gap-4 border-t pt-5">
                  <p className="text-sm font-semibold">生成结果</p>
                  {job.artifact.architecture && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">故事架构</p>
                      <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-6">
                        {job.artifact.architecture}
                      </p>
                    </div>
                  )}
                  {job.artifact.outline && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">章节蓝图</p>
                      <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-6">
                        {job.artifact.outline}
                      </p>
                    </div>
                  )}
                  {job.artifact.chapterDraft && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">章节草稿快照</p>
                      <Textarea
                        value={job.artifact.chapterDraft}
                        readOnly
                        aria-label="章节草稿快照"
                        className="mt-2 min-h-72 resize-y text-sm leading-6"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
