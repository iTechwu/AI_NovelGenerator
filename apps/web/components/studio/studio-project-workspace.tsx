'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookMarked,
  Clapperboard,
  Download,
  FileStack,
  LayoutDashboard,
  PenLine,
  RefreshCw,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import { Badge, Button, Progress, Skeleton } from '@repo/ui';
import type {
  StudioAdaptationProject,
  StudioBlueprint,
  StudioChapterPlan,
  StudioChapterRevision,
  StudioFact,
  StudioFactChange,
  StudioFinalizationTask,
  StudioProjectListResponse,
  StudioProjectOverview,
  StudioReviewFinding,
} from '@repo/contracts';
import { studioClient } from '@/lib/api/contracts/client';
import { Link } from '@/i18n/navigation';
import { publishProjectNavigationState } from '@/lib/studio/project-navigation';
import type { StudioProjectSection } from '@/lib/studio/project-routes';

export type { StudioProjectSection } from '@/lib/studio/project-routes';

const sectionMeta: Record<
  StudioProjectSection,
  { title: string; description: string; icon: typeof LayoutDashboard }
> = {
  overview: {
    title: '作品概览',
    description: '查看作品进度、任务状态与当前创作阶段。',
    icon: LayoutDashboard,
  },
  blueprint: {
    title: '蓝图与大纲',
    description: '集中阅读和调整故事架构与章节大纲。',
    icon: FileStack,
  },
  screenplay: {
    title: '剧本开发',
    description: '在独立剧本中规划分场、编写 Fountain 正文并管理版本。',
    icon: Clapperboard,
  },
  chapters: {
    title: '章节创作',
    description: '围绕已确认蓝图完成章节计划、草稿与定稿。',
    icon: PenLine,
  },
  review: {
    title: '质量与评审',
    description: '处理章节审校发现的问题，确保定稿前的一致性。',
    icon: ShieldCheck,
  },
  facts: {
    title: '设定与事实',
    description: '维护已确认的世界设定、角色状态与事实变更。',
    icon: BookMarked,
  },
  versions: {
    title: '版本与导出',
    description: '查看不可变版本，并导出当前定稿。',
    icon: ScrollText,
  },
  adaptation: {
    title: '小说转剧本',
    description: '从已定稿章节建立可追溯的剧集改编。',
    icon: Clapperboard,
  },
};

type StudioProjectListItem = StudioProjectListResponse['list'][number];

function taskVariant(status: StudioFinalizationTask['status']) {
  return status === 'failed' ? 'destructive' : status === 'completed' ? 'default' : 'secondary';
}

function EmptyWorkspace({ children }: { children: React.ReactNode }) {
  return <p className="border-y py-8 text-sm leading-6 text-muted-foreground">{children}</p>;
}

export function StudioProjectWorkspace({
  projectId,
  section,
}: {
  projectId: string;
  section: StudioProjectSection;
}) {
  const [project, setProject] = useState<StudioProjectListItem | null>(null);
  const [overview, setOverview] = useState<StudioProjectOverview | null>(null);
  const [blueprint, setBlueprint] = useState<StudioBlueprint | null>(null);
  const [chapterPlan, setChapterPlan] = useState<StudioChapterPlan | null>(null);
  const [revisions, setRevisions] = useState<StudioChapterRevision[]>([]);
  const [currentRevisionId, setCurrentRevisionId] = useState<string | null>(null);
  const [facts, setFacts] = useState<StudioFact[]>([]);
  const [factChanges, setFactChanges] = useState<StudioFactChange[]>([]);
  const [reviewFindings, setReviewFindings] = useState<StudioReviewFinding[]>([]);
  const [finalizationTasks, setFinalizationTasks] = useState<StudioFinalizationTask[]>([]);
  const [adaptations, setAdaptations] = useState<StudioAdaptationProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const currentRevision = useMemo(
    () => revisions.find((revision) => revision.id === currentRevisionId) ?? revisions[0] ?? null,
    [currentRevisionId, revisions],
  );

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projectsResponse, overviewResponse, blueprintResponse, tasksResponse] = await Promise.all([
        studioClient.listProjects({ query: { page: 1, limit: 100 } }),
        studioClient.getProjectOverview({ params: { projectId } }),
        studioClient.getBlueprint({ params: { projectId } }),
        studioClient.listFinalizationTasks({ params: { projectId }, query: { page: 1, limit: 30 } }),
      ]);

      if (projectsResponse.status === 200) {
        setProject(projectsResponse.body.data.list.find((item) => item.id === projectId) ?? null);
      }
      if (overviewResponse.status === 200) setOverview(overviewResponse.body.data);
      if (blueprintResponse.status === 200) setBlueprint(blueprintResponse.body.data);
      if (tasksResponse.status === 200) setFinalizationTasks(tasksResponse.body.data.list);

      if (blueprintResponse.status !== 200 || overviewResponse.status !== 200) {
        setError('作品工作区暂时无法加载，请稍后重试。');
        return;
      }

      const needsChapterData = ['chapters', 'review', 'facts', 'versions'].includes(section);
      if (needsChapterData && blueprintResponse.body.data.status === 'confirmed') {
        const [planResponse, revisionsResponse, factsResponse] = await Promise.all([
          studioClient.getChapterPlan({ params: { projectId, chapterNumber: 1 } }),
          studioClient.listChapterRevisions({
            params: { projectId, chapterNumber: 1 },
            query: { page: 1, limit: 50 },
          }),
          studioClient.listFacts({ params: { projectId }, query: { page: 1, limit: 100 } }),
        ]);
        if (planResponse.status === 200) setChapterPlan(planResponse.body.data);
        if (factsResponse.status === 200) setFacts(factsResponse.body.data.list);
        if (revisionsResponse.status === 200) {
          setRevisions(revisionsResponse.body.data.list);
          const revisionId =
            revisionsResponse.body.data.currentRevisionId ?? revisionsResponse.body.data.list[0]?.id;
          setCurrentRevisionId(revisionId ?? null);
          if (revisionId && ['review', 'facts'].includes(section)) {
            const [changesResponse, findingsResponse] = await Promise.all([
              studioClient.listFactChanges({
                params: { projectId, chapterNumber: 1, revisionId },
                query: { page: 1, limit: 100 },
              }),
              studioClient.listReviewFindings({
                params: { projectId, chapterNumber: 1, revisionId },
                query: { page: 1, limit: 100 },
              }),
            ]);
            if (changesResponse.status === 200) setFactChanges(changesResponse.body.data.list);
            if (findingsResponse.status === 200) setReviewFindings(findingsResponse.body.data.list);
          }
        }
      }

      if (section === 'adaptation') {
        const adaptationsResponse = await studioClient.listAdaptations({
          params: { projectId },
          query: { page: 1, limit: 50 },
        });
        if (adaptationsResponse.status === 200) setAdaptations(adaptationsResponse.body.data.list);
      }
    } catch {
      setError('作品工作区暂时无法加载，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, section]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    publishProjectNavigationState({
      projectId,
      projectFormat: project?.format,
      hasProject: Boolean(project),
      hasBlueprint: Boolean(blueprint),
      hasChapterWorkspace: blueprint?.status === 'confirmed',
      hasDraftWorkspace: revisions.length > 0,
      hasAdaptationSource: Boolean(overview && overview.finalizedChapterCount > 0),
    });
  }, [blueprint, overview, project?.format, projectId, revisions.length]);

  const exportProject = async () => {
    setIsExporting(true);
    try {
      const response = await studioClient.exportProject({
        params: { projectId },
        query: { format: 'md', force: false },
      });
      if (response.status !== 200) throw new Error('export-failed');
      const url = URL.createObjectURL(new Blob([response.body.data.content], { type: response.body.data.contentType }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = response.body.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('当前定稿暂时无法导出。');
    } finally {
      setIsExporting(false);
    }
  };

  const meta = sectionMeta[section];
  const Icon = meta.icon;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-5 py-8 md:px-8">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">作品库</Link>
            <span>/</span>
            <span className="truncate">{project?.title ?? '当前作品'}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Icon className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold">{meta.title}</h1>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{meta.description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadWorkspace()}>
          <RefreshCw className="size-4" />
          刷新
        </Button>
      </header>

      {isLoading && (
        <div className="grid gap-4" aria-label="正在加载作品工作区">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {error && !isLoading && <EmptyWorkspace>{error}</EmptyWorkspace>}

      {!isLoading && !error && section === 'overview' && overview && (
        <div className="grid gap-7">
          <dl className="grid gap-5 border-y py-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['已定稿', `${overview.finalizedChapterCount} 章`],
              ['确认事实', String(overview.confirmedFactCount)],
              ['待裁决建议', String(overview.pendingFactChangeCount)],
              ['阻断问题', String(overview.blockingFindingCount)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <section className="grid gap-3" aria-labelledby="task-status-heading">
            <h2 id="task-status-heading" className="text-base font-semibold">定稿后台任务</h2>
            {finalizationTasks.length === 0 ? (
              <EmptyWorkspace>当前没有待处理的定稿后台任务。</EmptyWorkspace>
            ) : (
              <ul className="divide-y border-y">
                {finalizationTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span>第 {task.chapterNumber} 章 · {task.type === 'summary' ? '摘要' : '索引'}</span>
                    <Badge variant={taskVariant(task.status)}>{task.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {!isLoading && !error && section === 'blueprint' && (
        blueprint ? (
          <div className="grid gap-7">
            <section className="grid gap-3" aria-labelledby="architecture-heading">
              <div className="flex items-center justify-between gap-3">
                <h2 id="architecture-heading" className="text-base font-semibold">故事架构</h2>
                <Badge variant={blueprint.status === 'confirmed' ? 'default' : 'secondary'}>
                  {blueprint.status === 'confirmed' ? '已确认' : '待编辑'}
                </Badge>
              </div>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap border p-4 text-sm leading-7">{blueprint.architecture}</pre>
            </section>
            <section className="grid gap-3" aria-labelledby="outline-heading">
              <h2 id="outline-heading" className="text-base font-semibold">章节大纲</h2>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap border p-4 text-sm leading-7">{blueprint.outline || '尚未生成章节大纲。'}</pre>
            </section>
          </div>
        ) : <EmptyWorkspace>蓝图尚未生成，作品生成完成后会在这里出现。</EmptyWorkspace>
      )}

      {!isLoading && !error && section === 'chapters' && (
        <div className="grid gap-7">
          {chapterPlan ? (
            <section className="grid gap-3" aria-labelledby="plan-heading">
              <div className="flex items-center justify-between gap-3">
                <h2 id="plan-heading" className="text-base font-semibold">第 1 章计划：{chapterPlan.title}</h2>
                <Badge variant={chapterPlan.status === 'confirmed' ? 'default' : 'secondary'}>{chapterPlan.status === 'confirmed' ? '已确认' : '草稿'}</Badge>
              </div>
              <dl className="grid gap-4 border-y py-4 text-sm leading-6 sm:grid-cols-2">
                <div><dt className="text-muted-foreground">目标</dt><dd>{chapterPlan.goal}</dd></div>
                <div><dt className="text-muted-foreground">冲突</dt><dd>{chapterPlan.conflict || '未填写'}</dd></div>
                <div><dt className="text-muted-foreground">地点</dt><dd>{chapterPlan.location || '未填写'}</dd></div>
                <div><dt className="text-muted-foreground">钩子</dt><dd>{chapterPlan.hook || '未填写'}</dd></div>
              </dl>
            </section>
          ) : <EmptyWorkspace>请先确认蓝图并建立第一章计划。</EmptyWorkspace>}
          {currentRevision ? (
            <section className="grid gap-3" aria-labelledby="draft-heading">
              <h2 id="draft-heading" className="text-base font-semibold">当前正文</h2>
              <article className="whitespace-pre-wrap border p-4 text-sm leading-8">{currentRevision.content}</article>
            </section>
          ) : <EmptyWorkspace>生成章节草稿后，正文会在这里继续创作。</EmptyWorkspace>}
        </div>
      )}

      {!isLoading && !error && section === 'review' && (
        <section className="grid gap-3" aria-labelledby="review-heading">
          <h2 id="review-heading" className="text-base font-semibold">硬事实审校</h2>
          {reviewFindings.length === 0 ? <EmptyWorkspace>当前版本没有待处理的审校问题。</EmptyWorkspace> : (
            <ul className="grid gap-3">
              {reviewFindings.map((finding) => (
                <li key={finding.id} className="grid gap-2 border-l-2 border-destructive pl-3 text-sm">
                  <div className="flex items-center gap-2"><Badge variant={finding.severity === 'blocking' ? 'destructive' : 'outline'}>{finding.status}</Badge><span>{finding.ruleId}</span></div>
                  <p>{finding.evidence}</p><p className="text-muted-foreground">{finding.suggestedAction}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!isLoading && !error && section === 'facts' && (
        <div className="grid gap-7">
          <section className="grid gap-3"><h2 className="text-base font-semibold">确认事实</h2>{facts.length === 0 ? <EmptyWorkspace>定稿后确认的事实会在这里沉淀。</EmptyWorkspace> : <ul className="divide-y border-y">{facts.map((fact) => <li key={fact.id} className="py-3 text-sm"><span className="font-medium">{fact.subject}</span> · {fact.predicate}：{fact.value}</li>)}</ul>}</section>
          <section className="grid gap-3"><h2 className="text-base font-semibold">章节事实建议</h2>{factChanges.length === 0 ? <EmptyWorkspace>当前版本没有待处理的事实建议。</EmptyWorkspace> : <ul className="divide-y border-y">{factChanges.map((change) => <li key={change.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{change.subject} · {change.predicate}：{change.proposedValue}</span><Badge variant={change.status === 'proposed' ? 'secondary' : 'outline'}>{change.status}</Badge></li>)}</ul>}</section>
        </div>
      )}

      {!isLoading && !error && section === 'versions' && (
        <div className="grid gap-7">
          <section className="grid gap-3"><h2 className="text-base font-semibold">章节版本</h2>{revisions.length === 0 ? <EmptyWorkspace>生成章节草稿后才能查看版本历史。</EmptyWorkspace> : <ul className="divide-y border-y">{revisions.map((revision) => <li key={revision.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>第 {revision.chapterNumber} 章 · v{revision.version}</span><Badge variant={revision.status === 'finalized' ? 'default' : 'outline'}>{revision.status === 'finalized' ? '已定稿' : revision.status}</Badge></li>)}</ul>}</section>
          <section className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold">导出当前定稿</h2><p className="mt-1 text-sm text-muted-foreground">导出已定稿章节及其关联元数据。</p></div><Button type="button" onClick={() => void exportProject()} disabled={isExporting || !overview?.finalizedChapterCount}><Download className="size-4" />{isExporting ? '正在导出' : '导出 Markdown'}</Button></section>
        </div>
      )}

      {!isLoading && !error && section === 'adaptation' && (
        <section className="grid gap-3" aria-labelledby="adaptation-heading">
          <h2 id="adaptation-heading" className="text-base font-semibold">改编项目</h2>
          {!overview?.finalizedChapterCount ? <EmptyWorkspace>至少定稿一章小说后，才能建立可追溯的剧本改编。</EmptyWorkspace> : adaptations.length === 0 ? <EmptyWorkspace>尚未建立改编项目。请在作品库的改编流程中创建第一份剧本简报。</EmptyWorkspace> : <ul className="divide-y border-y">{adaptations.map((adaptation) => <li key={adaptation.id} className="grid gap-1 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"><div><p className="font-medium">{adaptation.episodeCount} 集 {adaptation.targetFormat}</p><p className="mt-1 text-muted-foreground">{adaptation.adaptationGoal || '尚未填写改编目标'}</p></div><Badge variant="secondary">{adaptation.status}</Badge></li>)}</ul>}
        </section>
      )}
    </div>
  );
}
