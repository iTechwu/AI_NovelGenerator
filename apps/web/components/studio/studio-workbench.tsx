"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  Check,
  CircleAlert,
  FileText,
  FolderOpen,
  LoaderCircle,
  Save,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  Input,
  Label,
  Progress,
  Skeleton,
  Textarea,
} from "@repo/ui";
import { studioClient } from "@/lib/api/contracts/client";
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
  StudioProjectListResponse,
  UpdateStudioChapterPlan,
} from "@repo/contracts";

const initialProject: CreateStudioProject = {
  title: "",
  format: "novel",
  genre: "悬疑",
  premise: "",
  chapterCount: 20,
  targetWordsPerChapter: 3000,
  guidance: "",
  generateOutline: true,
};

const terminalStatuses = new Set(["succeeded", "failed"]);
type StudioProjectListItem = StudioProjectListResponse["list"][number];

const initialChapterPlan: UpdateStudioChapterPlan = {
  title: "",
  goal: "",
  conflict: "",
  characters: [],
  location: "",
  timeConstraint: "",
  foreshadowing: "",
  hook: "",
};

function statusLabel(status: GenerationJob["status"]): string {
  return {
    queued: "等待执行",
    running: "生成中",
    succeeded: "已完成",
    failed: "生成失败",
  }[status];
}

function statusVariant(
  status: GenerationJob["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "succeeded") return "default";
  if (status === "failed") return "destructive";
  if (status === "running") return "secondary";
  return "outline";
}

export function StudioWorkbench() {
  const [project, setProject] = useState<CreateStudioProject>(initialProject);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [blueprint, setBlueprint] = useState<StudioBlueprint | null>(null);
  const [chapterPlan, setChapterPlan] = useState<StudioChapterPlan | null>(
    null,
  );
  const [chapterPlanDraft, setChapterPlanDraft] =
    useState<UpdateStudioChapterPlan>(initialChapterPlan);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterRevisions, setChapterRevisions] = useState<
    StudioChapterRevision[]
  >([]);
  const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(
    null,
  );
  const [selectedRevision, setSelectedRevision] =
    useState<StudioChapterRevision | null>(null);
  const [comparisonRevisionId, setComparisonRevisionId] = useState<
    string | null
  >(null);
  const [revisionDiff, setRevisionDiff] =
    useState<StudioChapterRevisionDiff | null>(null);
  const [factChanges, setFactChanges] = useState<StudioFactChange[]>([]);
  const [confirmedFacts, setConfirmedFacts] = useState<StudioFact[]>([]);
  const [factChangeDraft, setFactChangeDraft] =
    useState<CreateStudioFactChange>({
      operation: "add",
      factType: "character",
      subject: "",
      predicate: "",
      proposedValue: "",
      rationale: "",
      evidence: "",
    });
  const [editingFactChangeId, setEditingFactChangeId] = useState<string | null>(
    null,
  );
  const [editedFactValue, setEditedFactValue] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [projects, setProjects] = useState<StudioProjectListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [openingRunId, setOpeningRunId] = useState<string | null>(null);
  const [isSavingBlueprint, setIsSavingBlueprint] = useState(false);
  const [isSavingChapterPlan, setIsSavingChapterPlan] = useState(false);
  const [isGeneratingChapterDraft, setIsGeneratingChapterDraft] =
    useState(false);
  const [isRestoringChapterDraft, setIsRestoringChapterDraft] =
    useState(false);
  const [isSavingFactChange, setIsSavingFactChange] = useState(false);
  const [resolvingFactChangeId, setResolvingFactChangeId] = useState<
    string | null
  >(null);
  const factChangesRequestId = useRef(0);
  const [isEditingConfirmedBlueprint, setIsEditingConfirmedBlueprint] =
    useState(false);
  const [isEditingConfirmedChapterPlan, setIsEditingConfirmedChapterPlan] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const [chapterPlanError, setChapterPlanError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setLibraryError(null);

    try {
      const response = await studioClient.listProjects({
        query: { page: 1, limit: 20 },
      });
      if (response.status === 200) {
        setProjects(response.body.data.list);
      } else {
        setLibraryError("作品库暂时无法加载。");
      }
    } catch {
      setLibraryError("作品库暂时无法加载。");
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProjects(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProjects]);

  const loadBlueprint = useCallback(async (projectId: string) => {
    setBlueprintError(null);
    try {
      const response = await studioClient.getBlueprint({
        params: { projectId },
      });
      if (response.status === 200) setBlueprint(response.body.data);
    } catch {
      setBlueprintError("蓝图暂时无法加载。");
    }
  }, []);

  useEffect(() => {
    if (job?.status !== "succeeded") return;

    const timer = window.setTimeout(
      () => void loadBlueprint(job.project.id),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [job, loadBlueprint]);

  const loadChapterPlan = useCallback(
    async (projectId: string, nextChapterNumber: number) => {
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
    },
    [],
  );

  useEffect(() => {
    if (blueprint?.status !== "confirmed" || isEditingConfirmedBlueprint)
      return;

    const timer = window.setTimeout(
      () => void loadChapterPlan(blueprint.projectId, chapterNumber),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [blueprint, chapterNumber, isEditingConfirmedBlueprint, loadChapterPlan]);

  const loadChapterRevisions = useCallback(
    async (projectId: string, nextChapterNumber: number) => {
      try {
        const response = await studioClient.listChapterRevisions({
          params: { projectId, chapterNumber: nextChapterNumber },
          query: { page: 1, limit: 20 },
        });
        if (response.status === 200) {
          const { list, currentRevisionId: nextCurrentRevisionId } =
            response.body.data;
          setChapterRevisions(list);
          setCurrentRevisionId(nextCurrentRevisionId ?? null);
          setSelectedRevision(
            list.find((revision) => revision.id === nextCurrentRevisionId) ??
              list[0] ??
              null,
          );
          const selectedId =
            list.find((revision) => revision.id === nextCurrentRevisionId)?.id ??
            list[0]?.id;
          setComparisonRevisionId(
            list.find((revision) => revision.id !== selectedId)?.id ?? null,
          );
        }
      } catch {
        setChapterRevisions([]);
        setCurrentRevisionId(null);
        setSelectedRevision(null);
        setComparisonRevisionId(null);
        setRevisionDiff(null);
      }
    },
    [],
  );

  useEffect(() => {
    if (chapterPlan?.status !== "confirmed") return;
    const timer = window.setTimeout(
      () => void loadChapterRevisions(chapterPlan.projectId, chapterPlan.chapterNumber),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [chapterPlan, job?.revisionId, loadChapterRevisions]);

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

  const loadFactChanges = useCallback(
    async (projectId: string, chapter: number, revisionId: string) => {
      const requestId = ++factChangesRequestId.current;
      try {
        const response = await studioClient.listFactChanges({
          params: { projectId, chapterNumber: chapter, revisionId },
          query: { page: 1, limit: 50 },
        });
        if (
          response.status === 200 &&
          requestId === factChangesRequestId.current
        ) {
          setFactChanges((current) => {
            const serverIds = new Set(
              response.body.data.list.map((change) => change.id),
            );
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
      () =>
        void loadFactChanges(
          blueprint.projectId,
          chapterNumber,
          selectedRevision.id,
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [blueprint, chapterNumber, selectedRevision, loadFactChanges]);

  useEffect(() => {
    if (!job || terminalStatuses.has(job.status)) return;

    const timer = window.setTimeout(async () => {
      try {
        const response = await studioClient.getJob({
          params: { jobId: job.id },
        });
        if (response.status === 200) setJob(response.body.data);
      } catch {
        setError("任务状态暂时无法刷新。");
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

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        void loadProjects();
      } else {
        setError("项目没有成功进入生成队列。");
      }
    } catch {
      setError("无法创建项目。请确认已登录且创作运行时已启动。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLatestRun = async (item: StudioProjectListItem) => {
    if (!item.latestRun) return;

    setOpeningRunId(item.latestRun.id);
    setError(null);
    setBlueprint(null);
    setIsEditingConfirmedBlueprint(false);
    setChapterPlan(null);
    setChapterPlanDraft(initialChapterPlan);
    setIsEditingConfirmedChapterPlan(false);
    try {
      const response = await studioClient.getJob({
        params: { jobId: item.latestRun.id },
      });
      if (response.status === 200) {
        setJob(response.body.data);
      } else {
        setError("无法打开该作品的最近任务。");
      }
    } catch {
      setError("无法打开该作品的最近任务。");
    } finally {
      setOpeningRunId(null);
    }
  };

  const saveBlueprint = async () => {
    if (
      !blueprint ||
      (blueprint.status === "confirmed" && !isEditingConfirmedBlueprint)
    )
      return;

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
      } else setBlueprintError("蓝图保存失败。");
    } catch {
      setBlueprintError("蓝图保存失败。");
    } finally {
      setIsSavingBlueprint(false);
    }
  };

  const confirmBlueprint = async () => {
    if (!blueprint || blueprint.status === "confirmed") return;

    setIsSavingBlueprint(true);
    setBlueprintError(null);
    try {
      const response = await studioClient.confirmBlueprint({
        params: { projectId: blueprint.projectId },
        body: {},
      });
      if (response.status === 200) setBlueprint(response.body.data);
      else setBlueprintError("蓝图确认失败。");
    } catch {
      setBlueprintError("蓝图确认失败。");
    } finally {
      setIsSavingBlueprint(false);
    }
  };

  const saveChapterPlan = async () => {
    if (!blueprint || blueprint.status !== "confirmed") return;

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
        setChapterPlanError("章节计划保存失败。");
      }
    } catch {
      setChapterPlanError("章节计划保存失败。");
    } finally {
      setIsSavingChapterPlan(false);
    }
  };

  const confirmChapterPlan = async () => {
    if (!blueprint || !chapterPlan || chapterPlan.status === "confirmed")
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
        setChapterPlanError("章节计划确认失败。");
      }
    } catch {
      setChapterPlanError("章节计划确认失败。");
    } finally {
      setIsSavingChapterPlan(false);
    }
  };

  const createChapterDraft = async () => {
    if (!blueprint || !chapterPlan || chapterPlan.status !== "confirmed")
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
        setChapterPlanError("章节草稿没有成功进入生成队列。");
      }
    } catch {
      setChapterPlanError("无法生成章节草稿。请确认创作运行时已启动。");
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
        setChapterPlanError("恢复章节草稿失败。");
      }
    } catch {
      setChapterPlanError("恢复章节草稿失败。");
    } finally {
      setIsRestoringChapterDraft(false);
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
          subject: "",
          predicate: "",
          proposedValue: "",
          rationale: "",
          evidence: "",
        }));
      } else setChapterPlanError("事实建议保存失败。");
    } catch {
      setChapterPlanError("事实建议保存失败。");
    } finally {
      setIsSavingFactChange(false);
    }
  };

  const resolveFactChange = async (
    change: StudioFactChange,
    decision: "accept" | "edit" | "reject",
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
          ...(decision === "edit" ? { resolvedValue: editedFactValue } : {}),
        },
      });
      if (response.status === 200) {
        setFactChanges((current) =>
          current.map((item) =>
            item.id === change.id ? response.body.data : item,
          ),
        );
        setEditingFactChangeId(null);
        setEditedFactValue("");
        void loadConfirmedFacts(blueprint.projectId);
      } else setChapterPlanError("事实建议裁决失败。");
    } catch {
      setChapterPlanError("事实建议裁决失败。");
    } finally {
      setResolvingFactChangeId(null);
    }
  };

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
        {job && (
          <Badge variant={statusVariant(job.status)}>
            {statusLabel(job.status)}
          </Badge>
        )}
      </header>

      <section
        className="grid gap-4 border-b pb-7"
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadProjects()}
            >
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
                      <Badge
                        variant={
                          latestRun
                            ? statusVariant(latestRun.status)
                            : "outline"
                        }
                      >
                        {latestRun ? statusLabel(latestRun.status) : "未生成"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.genre} · {item.chapterCount} 章 · 每章{" "}
                      {item.targetWordsPerChapter} 字
                    </p>
                    {latestRun && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <Progress
                          value={latestRun.progress}
                          className="h-1.5 w-24"
                          aria-label={`${item.title} 生成进度`}
                        />
                        <span>{latestRun.progress}%</span>
                        <span className="truncate">
                          {latestRun.currentStep}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!latestRun || openingRunId === latestRun.id}
                    onClick={() => void openLatestRun(item)}
                  >
                    {openingRunId === latestRun?.id ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <FolderOpen />
                    )}
                    查看任务
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={submit} className="grid gap-6">
          <section className="grid gap-5 border-b pb-7">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h2 className="text-base font-semibold">故事设定</h2>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">项目名称</Label>
              <Input
                id="title"
                value={project.title}
                onChange={(event) => updateProject("title", event.target.value)}
                placeholder="例如：雾港来信"
                maxLength={120}
                required
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="format">创作类型</Label>
                <select
                  id="format"
                  value={project.format}
                  onChange={(event) =>
                    updateProject(
                      "format",
                      event.target.value as CreateStudioProject["format"],
                    )
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="novel">小说</option>
                  <option value="screenplay">剧本</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="genre">题材</Label>
                <Input
                  id="genre"
                  value={project.genre}
                  onChange={(event) =>
                    updateProject("genre", event.target.value)
                  }
                  placeholder="悬疑、科幻、言情"
                  maxLength={80}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="chapters">章节数量</Label>
                <Input
                  id="chapters"
                  type="number"
                  min={1}
                  max={500}
                  value={project.chapterCount}
                  onChange={(event) =>
                    updateProject("chapterCount", Number(event.target.value))
                  }
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="premise">故事梗概</Label>
              <Textarea
                id="premise"
                value={project.premise}
                onChange={(event) =>
                  updateProject("premise", event.target.value)
                }
                placeholder="描述主角、冲突、世界背景和你希望故事抵达的结局。"
                className="min-h-36 resize-y"
                maxLength={4000}
                required
              />
              <p className="text-xs text-muted-foreground">
                至少 20 个字符，越具体越利于保持长篇一致性。
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
                    updateProject(
                      "targetWordsPerChapter",
                      Number(event.target.value),
                    )
                  }
                  required
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 self-end rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={project.generateOutline}
                  onChange={(event) =>
                    updateProject("generateOutline", event.target.checked)
                  }
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
                onChange={(event) =>
                  updateProject("guidance", event.target.value)
                }
                placeholder="例如：保持冷峻克制的叙述，感情线缓慢推进，避免超自然设定。"
                className="min-h-24 resize-y"
                maxLength={2000}
              />
            </div>
          </section>

          {error && (
            <div
              className="flex items-start gap-2 text-sm text-destructive"
              role="alert"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                Boolean(job && !terminalStatuses.has(job.status))
              }
            >
              {isSubmitting || job?.status === "running" ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {job && !terminalStatuses.has(job.status)
                ? "正在生成"
                : "生成故事架构"}
            </Button>
          </div>
        </form>

        <aside className="border-l pl-0 lg:pl-8">
          <div className="grid gap-5">
            <div>
              <p className="text-sm font-semibold">运行状态</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {job
                  ? job.currentStep
                  : "填写故事设定后，生成任务会出现在这里。"}
              </p>
            </div>

            {blueprint && (
              <section
                className="grid gap-4 border-t pt-5"
                aria-labelledby="blueprint-heading"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p id="blueprint-heading" className="text-sm font-semibold">
                      创作蓝图
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      版本 {blueprint.version}
                    </p>
                  </div>
                  <Badge
                    variant={
                      blueprint.status === "confirmed" ? "default" : "secondary"
                    }
                  >
                    {blueprint.status === "confirmed" ? "已确认" : "待确认"}
                  </Badge>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="blueprint-architecture">故事架构</Label>
                  <Textarea
                    id="blueprint-architecture"
                    value={blueprint.architecture}
                    disabled={
                      (blueprint.status === "confirmed" &&
                        !isEditingConfirmedBlueprint) ||
                      isSavingBlueprint
                    }
                    onChange={(event) =>
                      setBlueprint((current) =>
                        current
                          ? { ...current, architecture: event.target.value }
                          : current,
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
                      (blueprint.status === "confirmed" &&
                        !isEditingConfirmedBlueprint) ||
                      isSavingBlueprint
                    }
                    onChange={(event) =>
                      setBlueprint((current) =>
                        current
                          ? { ...current, outline: event.target.value }
                          : current,
                      )
                    }
                    className="min-h-28 resize-y"
                  />
                </div>

                {blueprintError && (
                  <p className="text-sm text-destructive">{blueprintError}</p>
                )}

                {blueprint.status === "confirmed" &&
                  !isEditingConfirmedBlueprint && (
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

                {(blueprint.status === "draft" ||
                  isEditingConfirmedBlueprint) && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void saveBlueprint()}
                      disabled={isSavingBlueprint}
                    >
                      {isSavingBlueprint ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Save />
                      )}
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

            {blueprint?.status === "confirmed" &&
              !isEditingConfirmedBlueprint && (
                <section
                  className="grid gap-4 border-t pt-5"
                  aria-labelledby="chapter-plan-heading"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p
                        id="chapter-plan-heading"
                        className="text-sm font-semibold"
                      >
                        章节计划
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        草稿生成前必须确认
                      </p>
                    </div>
                    {chapterPlan && (
                      <Badge
                        variant={
                          chapterPlan.status === "confirmed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {chapterPlan.status === "confirmed"
                          ? "已确认"
                          : "待确认"}
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
                      onChange={(event) =>
                        setChapterNumber(Number(event.target.value) || 1)
                      }
                      disabled={isSavingChapterPlan}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="chapter-title">章节标题</Label>
                    <Input
                      id="chapter-title"
                      value={chapterPlanDraft.title}
                      disabled={
                        (chapterPlan?.status === "confirmed" &&
                          !isEditingConfirmedChapterPlan) ||
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
                        (chapterPlan?.status === "confirmed" &&
                          !isEditingConfirmedChapterPlan) ||
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
                        (chapterPlan?.status === "confirmed" &&
                          !isEditingConfirmedChapterPlan) ||
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
                      value={chapterPlanDraft.characters.join("，")}
                      disabled={
                        (chapterPlan?.status === "confirmed" &&
                          !isEditingConfirmedChapterPlan) ||
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
                          (chapterPlan?.status === "confirmed" &&
                            !isEditingConfirmedChapterPlan) ||
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
                          (chapterPlan?.status === "confirmed" &&
                            !isEditingConfirmedChapterPlan) ||
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
                        (chapterPlan?.status === "confirmed" &&
                          !isEditingConfirmedChapterPlan) ||
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
                    <p className="text-sm text-destructive">
                      {chapterPlanError}
                    </p>
                  )}

                  {chapterPlan?.status === "confirmed" &&
                    !isEditingConfirmedChapterPlan && (
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="draft-prompt">本次附加要求</Label>
                          <Textarea
                            id="draft-prompt"
                            value={draftPrompt}
                            onChange={(event) => setDraftPrompt(event.target.value)}
                            disabled={isGeneratingChapterDraft}
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
                            disabled={isGeneratingChapterDraft}
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

                  {(chapterPlan?.status !== "confirmed" ||
                    isEditingConfirmedChapterPlan) && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void saveChapterPlan()}
                        disabled={isSavingChapterPlan}
                      >
                        {isSavingChapterPlan ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Save />
                        )}
                        保存计划
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void confirmChapterPlan()}
                        disabled={
                          isSavingChapterPlan ||
                          !chapterPlan ||
                          chapterPlan.status === "confirmed"
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
                                    ? chapterRevisions.find(
                                        (candidate) => candidate.id !== revision.id,
                                      )?.id ?? null
                                    : current,
                                );
                              }}
                            >
                              <span className="font-medium">
                                草稿 v{revision.version}
                              </span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {revision.wordCount} 词
                              </span>
                            </button>
                            {currentRevisionId === revision.id ? (
                              <Badge variant="default">当前</Badge>
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
                        ))}
                      </div>
                      {selectedRevision && (
                        <div className="grid gap-2">
                          <Label htmlFor="selected-chapter-draft">
                            草稿 v{selectedRevision.version} 正文
                          </Label>
                          <Textarea
                            id="selected-chapter-draft"
                            value={selectedRevision.content}
                            readOnly
                            className="min-h-64 resize-y text-sm leading-6"
                          />
                        </div>
                      )}
                      {selectedRevision && comparisonRevisionId && (
                        <div className="grid gap-2">
                          <Label htmlFor="comparison-revision">
                            与版本比较
                          </Label>
                          <select
                            id="comparison-revision"
                            value={comparisonRevisionId}
                            onChange={(event) =>
                              setComparisonRevisionId(event.target.value)
                            }
                            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {chapterRevisions
                              .filter(
                                (revision) => revision.id !== selectedRevision.id,
                              )
                              .map((revision) => (
                                <option key={revision.id} value={revision.id}>
                                  草稿 v{revision.version}
                                </option>
                              ))}
                          </select>
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
                                  segment.type === "added"
                                    ? "bg-emerald-100 text-emerald-950"
                                    : segment.type === "removed"
                                      ? "bg-rose-100 text-rose-950 line-through"
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
                        <div className="grid gap-3 border-t pt-4">
                          <div>
                            <p className="text-sm font-semibold">事实建议</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              只有接受或编辑后接受的建议会写入确认事实层。
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="fact-operation">变更操作</Label>
                              <select
                                id="fact-operation"
                                className="h-10 w-full border bg-background px-3 text-sm"
                                value={factChangeDraft.operation}
                                onChange={(event) =>
                                  setFactChangeDraft((current) => ({
                                    ...current,
                                    operation: event.target.value as CreateStudioFactChange["operation"],
                                    factId: undefined,
                                    proposedValue:
                                      event.target.value === "remove"
                                        ? ""
                                        : current.proposedValue,
                                  }))
                                }
                              >
                                <option value="add">新增事实</option>
                                <option value="update">更新事实</option>
                                <option value="remove">移除事实</option>
                              </select>
                            </div>
                            {factChangeDraft.operation !== "add" && (
                              <div className="grid gap-2">
                                <Label htmlFor="fact-target">目标确认事实</Label>
                                <select
                                  id="fact-target"
                                  className="h-10 w-full border bg-background px-3 text-sm"
                                  value={factChangeDraft.factId ?? ""}
                                  onChange={(event) => {
                                    const fact = confirmedFacts.find(
                                      (item) => item.id === event.target.value,
                                    );
                                    setFactChangeDraft((current) => ({
                                      ...current,
                                      factId: fact?.id,
                                      factType: fact?.factType ?? current.factType,
                                      subject: fact?.subject ?? current.subject,
                                      predicate: fact?.predicate ?? current.predicate,
                                      proposedValue:
                                        current.operation === "remove"
                                          ? ""
                                          : (fact?.value ?? current.proposedValue),
                                    }));
                                  }}
                                >
                                  <option value="">请选择已确认事实</option>
                                  {confirmedFacts.map((fact) => (
                                    <option key={fact.id} value={fact.id}>
                                      {fact.subject} · {fact.predicate}：{fact.value}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="grid gap-2">
                              <Label htmlFor="fact-type">事实类型</Label>
                              <Input
                                id="fact-type"
                                value={factChangeDraft.factType}
                                maxLength={80}
                                disabled={factChangeDraft.operation === "remove"}
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
                                disabled={factChangeDraft.operation === "remove"}
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
                              disabled={factChangeDraft.operation === "remove"}
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
                              {factChangeDraft.operation === "remove"
                                ? "移除目标"
                                : "建议事实值"}
                            </Label>
                            <Textarea
                              id="fact-value"
                              value={factChangeDraft.proposedValue}
                              maxLength={20000}
                              className="min-h-20 resize-y"
                              disabled={factChangeDraft.operation === "remove"}
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
                              (factChangeDraft.operation !== "add" &&
                                !factChangeDraft.factId) ||
                              !factChangeDraft.factType ||
                              !factChangeDraft.subject ||
                              !factChangeDraft.predicate ||
                              (factChangeDraft.operation !== "remove" &&
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
                                  {change.operation === "add"
                                    ? "新增"
                                    : change.operation === "update"
                                      ? "更新"
                                      : "移除"}
                                  ：{change.subject} · {change.predicate}
                                </p>
                                <Badge
                                  variant={
                                    change.status === "accepted"
                                      ? "default"
                                      : change.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {change.status === "accepted"
                                    ? "已接受"
                                    : change.status === "rejected"
                                      ? "已拒绝"
                                      : "待裁决"}
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
                              {typeof change.confidence === "number" && (
                                <p className="text-xs text-muted-foreground">
                                  证据置信度：{Math.round(change.confidence * 100)}%
                                </p>
                              )}
                              {change.status === "proposed" && (
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={resolvingFactChangeId === change.id}
                                    onClick={() =>
                                      void resolveFactChange(change, "accept")
                                    }
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
                                    onClick={() =>
                                      void resolveFactChange(change, "reject")
                                    }
                                  >
                                    拒绝
                                  </Button>
                                </div>
                              )}
                              {editingFactChangeId === change.id && (
                                <div className="grid gap-2">
                                  <Label htmlFor={`fact-edit-${change.id}`}>
                                    确认事实值
                                  </Label>
                                  <Textarea
                                    id={`fact-edit-${change.id}`}
                                    value={editedFactValue}
                                    className="min-h-20 resize-y"
                                    onChange={(event) =>
                                      setEditedFactValue(event.target.value)
                                    }
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                      resolvingFactChangeId === change.id ||
                                      !editedFactValue.trim()
                                    }
                                    onClick={() =>
                                      void resolveFactChange(change, "edit")
                                    }
                                  >
                                    确认编辑
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

            <Progress
              value={job?.progress ?? 0}
              className="h-2"
              aria-label="生成进度"
            />
            <p className="text-sm tabular-nums text-muted-foreground">
              {job?.progress ?? 0}%
            </p>

            {job?.artifact && (
              <div className="grid gap-4 border-t pt-5">
                <p className="text-sm font-semibold">生成结果</p>
                {job.artifact.architecture && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      故事架构
                    </p>
                    <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-6">
                      {job.artifact.architecture}
                    </p>
                  </div>
                )}
                {job.artifact.outline && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      章节蓝图
                    </p>
                    <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-6">
                      {job.artifact.outline}
                    </p>
                  </div>
                )}
                {job.artifact.chapterDraft && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      章节草稿快照
                    </p>
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
    </div>
  );
}
