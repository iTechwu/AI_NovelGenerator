'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clapperboard, Download, FilePlus2, RefreshCw, Save, ScrollText } from 'lucide-react';
import { Badge, Button, Input, Skeleton, Textarea } from '@repo/ui';
import type {
  StudioProjectListResponse,
  StudioStandaloneScreenplayRevision,
  StudioStandaloneScreenplayScene,
} from '@repo/contracts';
import { Link } from '@/i18n/navigation';
import { studioClient } from '@/lib/api/contracts/client';
import { publishProjectNavigationState } from '@/lib/studio/project-navigation';

type Project = StudioProjectListResponse['list'][number];
type SceneDraft = Pick<
  StudioStandaloneScreenplayScene,
  'episodeNumber' | 'sceneNumber' | 'title' | 'synopsis' | 'status'
>;

const emptySceneDraft: SceneDraft = {
  episodeNumber: 1,
  sceneNumber: 1,
  title: '',
  synopsis: '',
  status: 'draft',
};

export function StudioScreenplayWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<StudioStandaloneScreenplayScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [sceneDraft, setSceneDraft] = useState<SceneDraft>(emptySceneDraft);
  const [revisions, setRevisions] = useState<StudioStandaloneScreenplayRevision[]>([]);
  const [content, setContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingScene, setIsSavingScene] = useState(false);
  const [isSavingRevision, setIsSavingRevision] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedScene = useMemo(
    () => scenes.find((scene) => scene.id === selectedSceneId) ?? null,
    [scenes, selectedSceneId],
  );

  const loadRevisions = useCallback(
    async (sceneId: string) => {
      const response = await studioClient.listStandaloneScreenplayRevisions({
        params: { projectId, sceneId },
        query: { page: 1, limit: 50 },
      });
      if (response.status !== 200) throw new Error('revisions-unavailable');
      setRevisions(response.body.data.list);
      setContent(response.body.data.list[0]?.content ?? '');
      setEditSummary('');
    },
    [projectId],
  );

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projectsResponse, scenesResponse] = await Promise.all([
        studioClient.listProjects({ query: { page: 1, limit: 100 } }),
        studioClient.listStandaloneScreenplayScenes({
          params: { projectId },
          query: { page: 1, limit: 500 },
        }),
      ]);
      const loadedProject =
        projectsResponse.status === 200
          ? projectsResponse.body.data.list.find((item) => item.id === projectId) ?? null
          : null;
      if (!loadedProject || loadedProject.format !== 'screenplay' || scenesResponse.status !== 200) {
        throw new Error('workspace-unavailable');
      }
      setProject(loadedProject);
      setScenes(scenesResponse.body.data.list);
      const nextScene = scenesResponse.body.data.list.find((scene) => scene.id === selectedSceneId)
        ?? scenesResponse.body.data.list[0]
        ?? null;
      setSelectedSceneId(nextScene?.id ?? null);
      if (nextScene) {
        setSceneDraft({
          episodeNumber: nextScene.episodeNumber,
          sceneNumber: nextScene.sceneNumber,
          title: nextScene.title,
          synopsis: nextScene.synopsis,
          status: nextScene.status,
        });
        await loadRevisions(nextScene.id);
      } else {
        setSceneDraft(emptySceneDraft);
        setRevisions([]);
        setContent('');
      }
    } catch {
      setError('剧本工作台暂时无法加载，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  }, [loadRevisions, projectId, selectedSceneId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    publishProjectNavigationState({
      projectId,
      projectFormat: project?.format,
      hasProject: Boolean(project),
      hasBlueprint: Boolean(project),
      hasChapterWorkspace: false,
      hasDraftWorkspace: revisions.length > 0,
      hasAdaptationSource: false,
    });
  }, [project, projectId, revisions.length]);

  const selectScene = async (scene: StudioStandaloneScreenplayScene) => {
    setError(null);
    setSelectedSceneId(scene.id);
    setSceneDraft({
      episodeNumber: scene.episodeNumber,
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      synopsis: scene.synopsis,
      status: scene.status,
    });
    try {
      await loadRevisions(scene.id);
    } catch {
      setError('该场景的版本暂时无法加载。');
    }
  };

  const createScene = () => {
    const lastScene = scenes.at(-1);
    setSelectedSceneId(null);
    setSceneDraft({
      episodeNumber: lastScene?.episodeNumber ?? 1,
      sceneNumber: (lastScene?.sceneNumber ?? 0) + 1,
      title: '',
      synopsis: '',
      status: 'draft',
    });
    setRevisions([]);
    setContent('');
    setEditSummary('');
  };

  const saveScene = async (status = sceneDraft.status) => {
    if (!sceneDraft.title.trim()) {
      setError('请为场景填写标题。');
      return;
    }
    setIsSavingScene(true);
    setError(null);
    try {
      const response = await studioClient.saveStandaloneScreenplayScene({
        params: { projectId },
        body: { ...sceneDraft, title: sceneDraft.title.trim(), synopsis: sceneDraft.synopsis.trim(), status },
      });
      if (response.status !== 200) throw new Error('scene-save-failed');
      const saved = response.body.data;
      setScenes((current) =>
        [...current.filter((scene) => scene.id !== saved.id), saved].sort(
          (left, right) =>
            left.episodeNumber - right.episodeNumber || left.sceneNumber - right.sceneNumber,
        ),
      );
      setSelectedSceneId(saved.id);
      setSceneDraft({
        episodeNumber: saved.episodeNumber,
        sceneNumber: saved.sceneNumber,
        title: saved.title,
        synopsis: saved.synopsis,
        status: saved.status,
      });
    } catch {
      setError('场景计划暂时无法保存。');
    } finally {
      setIsSavingScene(false);
    }
  };

  const saveRevision = async () => {
    if (!selectedSceneId || !content.trim()) {
      setError('请先保存场景计划并填写剧本正文。');
      return;
    }
    setIsSavingRevision(true);
    setError(null);
    try {
      const response = await studioClient.createStandaloneScreenplayRevision({
        params: { projectId, sceneId: selectedSceneId },
        body: { content: content.trim(), ...(editSummary.trim() ? { editSummary: editSummary.trim() } : {}) },
      });
      if (response.status !== 201) throw new Error('revision-save-failed');
      setRevisions((current) => [response.body.data, ...current]);
      setEditSummary('');
    } catch {
      setError('剧本版本暂时无法保存。');
    } finally {
      setIsSavingRevision(false);
    }
  };

  const exportScreenplay = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const response = await studioClient.exportStandaloneScreenplay({
        params: { projectId },
        query: { format: 'fountain' },
      });
      if (response.status !== 200) throw new Error('export-failed');
      const url = URL.createObjectURL(new Blob([response.body.data.content], { type: response.body.data.contentType }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = response.body.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('独立剧本暂时无法导出。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 py-8 md:px-8">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">作品库</Link><span>/</span><span className="truncate">{project?.title ?? '独立剧本'}</span>
          </div>
          <div className="mt-3 flex items-center gap-3"><Clapperboard className="size-5 text-primary" /><h1 className="text-2xl font-semibold">剧本开发</h1></div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">分集规划、分场写作与 Fountain 版本在同一工作区完成。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadWorkspace()}><RefreshCw className="size-4" />刷新</Button>
          <Button type="button" size="sm" onClick={() => void exportScreenplay()} disabled={isExporting || scenes.length === 0}><Download className="size-4" />{isExporting ? '正在导出' : '导出 Fountain'}</Button>
        </div>
      </header>

      {isLoading && <div className="grid gap-4"><Skeleton className="h-8 w-52" /><Skeleton className="h-[28rem] w-full" /></div>}
      {error && !isLoading && <p className="border-y py-4 text-sm text-destructive" role="alert">{error}</p>}

      {!isLoading && !error && (
        <div className="grid gap-5 xl:grid-cols-[15rem_minmax(0,1fr)_16rem]">
          <aside className="grid content-start gap-3 border p-3" aria-label="剧本场景">
            <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">分集与场景</h2><Button type="button" size="icon" variant="ghost" onClick={createScene} aria-label="新建场景"><FilePlus2 className="size-4" /></Button></div>
            {scenes.length === 0 ? <p className="text-sm leading-6 text-muted-foreground">先建立第一场，开始组织剧本节奏。</p> : <ul className="grid gap-1">{scenes.map((scene) => <li key={scene.id}><button type="button" onClick={() => void selectScene(scene)} className={`grid w-full gap-1 border-l-2 px-3 py-2 text-left text-sm ${selectedSceneId === scene.id ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}`}><span className="text-xs text-muted-foreground">第 {scene.episodeNumber} 集 · 场景 {scene.sceneNumber}</span><span className="truncate font-medium">{scene.title}</span></button></li>)}</ul>}
          </aside>

          <main className="grid content-start gap-5 border p-4">
            <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{selectedScene ? `第 ${sceneDraft.episodeNumber} 集 · 场景 ${sceneDraft.sceneNumber}` : '新建场景'}</h2><Badge variant={sceneDraft.status === 'confirmed' ? 'default' : 'secondary'}>{sceneDraft.status === 'confirmed' ? '已确认' : '草稿'}</Badge></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">集数<Input type="number" min={1} max={100} value={sceneDraft.episodeNumber} onChange={(event) => setSceneDraft((current) => ({ ...current, episodeNumber: Number(event.target.value) || 1 }))} /></label><label className="grid gap-2 text-sm font-medium">场景编号<Input type="number" min={1} max={200} value={sceneDraft.sceneNumber} onChange={(event) => setSceneDraft((current) => ({ ...current, sceneNumber: Number(event.target.value) || 1 }))} /></label></div>
            <label className="grid gap-2 text-sm font-medium">场景标题<Input value={sceneDraft.title} maxLength={200} onChange={(event) => setSceneDraft((current) => ({ ...current, title: event.target.value }))} placeholder="例如：港口的匿名录像" /></label>
            <label className="grid gap-2 text-sm font-medium">场景梗概<Textarea value={sceneDraft.synopsis} maxLength={5000} className="min-h-24" onChange={(event) => setSceneDraft((current) => ({ ...current, synopsis: event.target.value }))} placeholder="明确这一场的转折、人物目标与离场状态。" /></label>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void saveScene('draft')} disabled={isSavingScene}><Save className="size-4" />{isSavingScene ? '正在保存' : '保存场景'}</Button><Button type="button" onClick={() => void saveScene('confirmed')} disabled={isSavingScene || !selectedScene}><ScrollText className="size-4" />确认场景</Button></div>
            <div className="grid gap-3 border-t pt-5"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">剧本正文</h2><span className="text-xs text-muted-foreground">Fountain</span></div><Textarea value={content} maxLength={50_000} className="min-h-80 font-mono text-sm leading-7" onChange={(event) => setContent(event.target.value)} placeholder={'INT. 港口仓库 - 夜\n\n林舟推开生锈的门。\n\n林舟\n录像是谁寄来的？'} /><Input value={editSummary} maxLength={500} onChange={(event) => setEditSummary(event.target.value)} placeholder="本次改稿说明（可选）" /><Button type="button" onClick={() => void saveRevision()} disabled={isSavingRevision || !selectedSceneId || !content.trim()}><Save className="size-4" />{isSavingRevision ? '正在保存版本' : '保存为新版本'}</Button></div>
          </main>

          <aside className="grid content-start gap-3 border p-3" aria-label="剧本版本">
            <h2 className="text-sm font-semibold">版本记录</h2>
            {revisions.length === 0 ? <p className="text-sm leading-6 text-muted-foreground">保存正文后，每次改稿都会保留一份不可变版本。</p> : <ul className="grid gap-2">{revisions.map((revision) => <li key={revision.id} className="grid gap-1 border-b pb-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">v{revision.version}</span><span className="text-xs text-muted-foreground">{revision.wordCount} 字</span></div><p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{revision.editSummary || '未填写改稿说明'}</p></li>)}</ul>}
          </aside>
        </div>
      )}
    </div>
  );
}
