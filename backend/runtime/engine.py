"""Adapter from the HTTP runtime to the existing generation implementation."""

from __future__ import annotations

import json
import hashlib
import logging
import math
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from uuid import UUID


@dataclass(frozen=True)
class RuntimeSettings:
    storage_root: Path
    shared_secret: str
    api_key: str
    base_url: str
    model: str
    interface_format: str
    temperature: float
    max_tokens: int
    timeout_seconds: int
    # Per-stage model overrides. Each falls back to `model` when unset, so a
    # single LLM_MODEL still covers deployments that don't need per-stage routing.
    model_architecture: str = ''
    model_outline: str = ''
    model_chapter_draft: str = ''
    model_consistency_review: str = ''
    # Embedding config for knowledge/RAG. Empty endpoint/appkey => no embeddings.
    embedding_endpoint: str = ''
    embedding_appkey: str = ''
    embedding_model: str = ''
    embedding_interface_format: str = 'OpenAI'
    embedding_retrieval_k: int = 4

    @classmethod
    def from_environment(cls) -> 'RuntimeSettings':
        shared_secret = os.environ.get('NOVEL_RUNTIME_SHARED_SECRET', '')
        if not shared_secret:
            raise RuntimeError('NOVEL_RUNTIME_SHARED_SECRET must be configured')
        model = os.environ.get('LLM_MODEL', 'gpt-4.1-mini')
        return cls(
            storage_root=Path(os.environ.get('PROJECT_STORAGE_ROOT', '/data/projects')),
            shared_secret=shared_secret,
            api_key=os.environ.get('LLM_API_KEY', ''),
            base_url=os.environ.get('LLM_BASE_URL', 'https://api.openai.com/v1'),
            model=model,
            interface_format=os.environ.get('LLM_INTERFACE_FORMAT', 'OpenAI'),
            temperature=float(os.environ.get('LLM_TEMPERATURE', '0.7')),
            max_tokens=int(os.environ.get('LLM_MAX_TOKENS', '8192')),
            timeout_seconds=int(os.environ.get('LLM_TIMEOUT_SECONDS', '600')),
            model_architecture=os.environ.get('LLM_MODEL_ARCHITECTURE') or model,
            model_outline=os.environ.get('LLM_MODEL_OUTLINE') or model,
            model_chapter_draft=os.environ.get('LLM_MODEL_CHAPTER_DRAFT') or model,
            model_consistency_review=os.environ.get('LLM_MODEL_CONSISTENCY_REVIEW') or model,
            embedding_endpoint=os.environ.get('EMBEDDING_ENDPOINT', ''),
            embedding_appkey=os.environ.get('EMBEDDING_APPKEY', ''),
            embedding_model=os.environ.get('EMBEDDING_MODEL', ''),
            embedding_interface_format=os.environ.get('EMBEDDING_INTERFACE_FORMAT', 'OpenAI'),
            embedding_retrieval_k=int(os.environ.get('EMBEDDING_RETRIEVAL_K', '4')),
        )

    def build_embedding_adapter(self):
        """Build the embedding adapter from settings, or None if unconfigured.

        Lazily imports embedding_adapters (heavy langchain/google deps) so health
        checks and non-RAG jobs don't pay the import cost.
        """
        if not self.embedding_endpoint or not self.embedding_appkey:
            return None
        from embedding_adapters import create_embedding_adapter

        return create_embedding_adapter(
            interface_format=self.embedding_interface_format,
            api_key=self.embedding_appkey,
            base_url=self.embedding_endpoint,
            model_name=self.embedding_model,
        )


class GenerationEngine:
    def __init__(self, settings: RuntimeSettings) -> None:
        self._settings = settings

    def workspace_for(self, project_id: UUID, run_id: UUID) -> Path:
        return self._settings.storage_root / str(project_id) / 'outputs' / str(run_id)

    def checkpoint_path(self, project_id: UUID, run_id: UUID) -> Path:
        return self._settings.storage_root / str(project_id) / 'checkpoints' / str(run_id) / 'status.json'

    def input_snapshot_path(self, project_id: UUID, run_id: UUID) -> Path:
        return self._settings.storage_root / str(project_id) / 'inputs' / str(run_id) / 'request.json'

    def checkpoint_paths(self) -> list[Path]:
        return list(self._settings.storage_root.glob('*/checkpoints/*/status.json'))

    def finalization_task_path(self, project_id: UUID, task_id: UUID) -> Path:
        return self._settings.storage_root / str(project_id) / 'finalization-tasks' / str(task_id) / 'result.json'

    def execute_finalization_task(
        self,
        project_id: UUID,
        task_id: UUID,
        revision_id: UUID,
        chapter_number: int,
        task_type: str,
        content: str,
    ) -> dict[str, Any]:
        result_path = self.finalization_task_path(project_id, task_id)
        if result_path.exists():
            try:
                persisted = json.loads(result_path.read_text(encoding='utf-8'))
                if isinstance(persisted, dict):
                    return persisted
            except json.JSONDecodeError:
                pass

        if task_type == 'summary':
            compact = ' '.join(line.strip() for line in content.splitlines() if line.strip())
            result: dict[str, Any] = {
                'type': 'summary',
                'summary': compact[:2_000],
                'revisionId': str(revision_id),
                'chapterNumber': chapter_number,
            }
        elif task_type == 'index':
            result = {
                'type': 'index',
                'revisionId': str(revision_id),
                'chapterNumber': chapter_number,
                'contentChecksum': hashlib.sha256(content.encode('utf-8')).hexdigest(),
                'characterCount': len(content),
            }
        else:
            raise ValueError(f'Unsupported finalization task type: {task_type}')
        self._write_json(result_path, result)
        return result

    def write_input_snapshot(self, project_id: UUID, run_id: UUID, request: dict[str, Any]) -> None:
        self._write_json(self.input_snapshot_path(project_id, run_id), {
            'runId': str(run_id),
            **request,
        })

    def write_checkpoint(
        self,
        project_id: UUID,
        run_id: UUID,
        *,
        status: str,
        progress: int,
        current_step: str,
        error: str | None = None,
        job: dict[str, Any] | None = None,
    ) -> None:
        payload = {
            'projectId': str(project_id),
            'runId': str(run_id),
            'status': status,
            'progress': progress,
            'currentStep': current_step,
            'updatedAt': datetime.now(timezone.utc).isoformat(),
            **({'error': error} if error else {}),
            **({'job': job} if job else {}),
        }
        self._write_json(self.checkpoint_path(project_id, run_id), payload)

    @staticmethod
    def _write_json(path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = path.with_suffix('.tmp')
        temporary_path.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
        temporary_path.replace(path)

    def generate(self, project, run_id: UUID, report: Callable[[int, str], None]) -> dict[str, str]:
        if not self._settings.api_key:
            raise RuntimeError('LLM_API_KEY must be configured')

        if project.format == 'screenplay':
            return self._generate_screenplay_blueprint(project, run_id, report)

        # Import lazily so health checks and API startup do not load GUI-era dependencies.
        from novel_generator import Chapter_blueprint_generate, Novel_architecture_generate

        workspace = self.workspace_for(project.id, run_id)
        workspace.mkdir(parents=True, exist_ok=True)

        architecture_path = workspace / 'Novel_architecture.txt'
        if architecture_path.exists():
            report(55, 'Recovered story architecture')
        else:
            report(20, 'Generating story architecture')
            Novel_architecture_generate(
                interface_format=self._settings.interface_format,
                api_key=self._settings.api_key,
                base_url=self._settings.base_url,
                llm_model=self._settings.model_architecture,
                topic=project.premise,
                genre=project.genre,
                number_of_chapters=project.chapterCount,
                word_number=project.targetWordsPerChapter,
                filepath=str(workspace),
                user_guidance=project.guidance,
                temperature=self._settings.temperature,
                max_tokens=self._settings.max_tokens,
                timeout=self._settings.timeout_seconds,
            )

        artifact = {'architecture': self._read_output(architecture_path)}
        if project.generateOutline:
            outline_path = workspace / 'Novel_directory.txt'
            if outline_path.exists():
                report(90, 'Recovered chapter outline')
            else:
                report(70, 'Generating chapter outline')
                try:
                    Chapter_blueprint_generate(
                        interface_format=self._settings.interface_format,
                        api_key=self._settings.api_key,
                        base_url=self._settings.base_url,
                        llm_model=self._settings.model_outline,
                        filepath=str(workspace),
                        number_of_chapters=project.chapterCount,
                        user_guidance=project.guidance,
                        temperature=self._settings.temperature,
                        max_tokens=self._settings.max_tokens,
                        timeout=self._settings.timeout_seconds,
                    )
                except Exception:
                    # Keep an otherwise-complete project usable when the outline
                    # provider has a transient failure. Authors can refine this
                    # starter outline in the confirmed blueprint workflow.
                    report(85, 'Using starter chapter outline')
                    outline_path.write_text(
                        self._starter_outline(project.title, project.chapterCount),
                        encoding='utf-8',
                    )
            artifact['outline'] = self._read_output(outline_path)
        return artifact

    def _generate_screenplay_blueprint(
        self,
        project,
        run_id: UUID,
        report: Callable[[int, str], None],
    ) -> dict[str, str]:
        """Create an independent screenplay blueprint without reading novel data."""
        from llm_adapters import create_llm_adapter
        from novel_generator.common import invoke_with_cleaning

        workspace = self.workspace_for(project.id, run_id)
        workspace.mkdir(parents=True, exist_ok=True)
        architecture_path = workspace / 'Screenplay_architecture.txt'
        outline_path = workspace / 'Screenplay_episode_beats.txt'

        if architecture_path.exists():
            report(55, 'Recovered screenplay blueprint')
        else:
            report(25, 'Generating screenplay blueprint')
            try:
                adapter = create_llm_adapter(
                    interface_format=self._settings.interface_format,
                    base_url=self._settings.base_url,
                    model_name=self._settings.model_architecture,
                    api_key=self._settings.api_key,
                    temperature=self._settings.temperature,
                    max_tokens=self._settings.max_tokens,
                    timeout=self._settings.timeout_seconds,
                )
                architecture = invoke_with_cleaning(adapter, self._screenplay_blueprint_prompt(project))
            except Exception:
                architecture = self._starter_screenplay_architecture(project)
            architecture_path.write_text(architecture, encoding='utf-8')

        artifact = {'architecture': self._read_output(architecture_path)}
        if project.generateOutline:
            if outline_path.exists():
                report(90, 'Recovered episode beats')
            else:
                report(72, 'Generating episode beats')
                try:
                    adapter = create_llm_adapter(
                        interface_format=self._settings.interface_format,
                        base_url=self._settings.base_url,
                        model_name=self._settings.model_outline,
                        api_key=self._settings.api_key,
                        temperature=self._settings.temperature,
                        max_tokens=self._settings.max_tokens,
                        timeout=self._settings.timeout_seconds,
                    )
                    outline = invoke_with_cleaning(
                        adapter,
                        self._screenplay_episode_beats_prompt(project, artifact['architecture']),
                    )
                except Exception:
                    outline = self._starter_screenplay_outline(project.title, project.chapterCount)
                outline_path.write_text(outline, encoding='utf-8')
            artifact['outline'] = self._read_output(outline_path)
        return artifact

    @staticmethod
    def _screenplay_blueprint_prompt(project) -> str:
        return f'''你是一名中文影视编剧。根据以下一句话创意，写一份可编辑的独立剧本开发蓝图。
只输出蓝图，不要解释生成过程。请包含：项目定位、类型与受众、核心冲突、主要人物与关系、三幕/四幕节拍、结局方向和创作约束。

项目名称：{project.title}
题材：{project.genre}
一句话创意：{project.premise}
预计集数：{project.chapterCount}
单集目标篇幅：{project.targetWordsPerChapter} 字
作者要求：{project.guidance or '无'}'''

    @staticmethod
    def _screenplay_episode_beats_prompt(project, architecture: str) -> str:
        return f'''你是一名中文影视编剧。基于以下已生成的独立剧本开发蓝图，为 {project.chapterCount} 集输出分集节拍表。
每集必须包含：集数、标题、目标、冲突、结尾钩子、建议场景数。只输出节拍表，不要解释。

开发蓝图：
{architecture}

作者要求：{project.guidance or '无'}'''

    @staticmethod
    def _starter_screenplay_architecture(project) -> str:
        return (
            f'项目定位：独立{project.genre}剧本《{project.title}》\n'
            f'核心冲突：{project.premise}\n'
            '人物关系：主角必须在目标、代价与关系之间作出选择。\n'
            '结构节拍：建立危机 -> 主动追查 -> 局势反转 -> 最终抉择。\n'
            '结局方向：让主角的选择回应开场提出的核心问题。\n'
            f'创作约束：{project.guidance or "保持人物动机和情节推进清晰。"}'
        )

    @staticmethod
    def _starter_screenplay_outline(title: str, episode_count: int) -> str:
        stages = ('建立危机', '扩大冲突', '关系转折', '真相显现', '最终抉择')
        return '\n'.join(
            f'第 {episode_number} 集：{stages[(episode_number - 1) % len(stages)]} - 《{title}》'
            for episode_number in range(1, episode_count + 1)
        )

    @staticmethod
    def _starter_outline(title: str, chapter_count: int) -> str:
        stages = (
            '异象出现',
            '追索线索',
            '阻力加剧',
            '旧事浮现',
            '局势逆转',
            '真相逼近',
            '最终抉择',
            '余波未平',
        )
        return '\n'.join(
            f'第 {chapter_number} 章：{stages[(chapter_number - 1) % len(stages)]} - 《{title}》'
            for chapter_number in range(1, chapter_count + 1)
        )

    def generate_chapter_draft(
        self,
        project,
        blueprint,
        chapter_plan,
        prompt_instruction: str,
        run_id: UUID,
        report: Callable[[int, str], None],
    ) -> dict[str, Any]:
        if not self._settings.api_key:
            raise RuntimeError('LLM_API_KEY must be configured')

        # This path uses only the confirmed structured inputs from NestJS. It
        # deliberately does not mutate legacy project text files or chapter plans.
        from llm_adapters import create_llm_adapter
        from novel_generator.common import invoke_with_cleaning

        workspace = self.workspace_for(project.id, run_id)
        workspace.mkdir(parents=True, exist_ok=True)
        output = workspace / f'chapter_{chapter_plan.chapterNumber}_draft.txt'
        fact_changes_path = workspace / 'fact_changes.json'
        if output.exists():
            report(90, 'Recovered chapter draft')
            return {
                'chapterDraft': self._read_output(output),
                'factChanges': self._read_fact_changes(fact_changes_path),
            }
        report(30, 'Preparing confirmed chapter plan')
        prompt = self._chapter_draft_prompt(project, blueprint, chapter_plan, prompt_instruction)
        adapter = create_llm_adapter(
            interface_format=self._settings.interface_format,
            base_url=self._settings.base_url,
            model_name=self._settings.model_chapter_draft,
            api_key=self._settings.api_key,
            temperature=self._settings.temperature,
            max_tokens=self._settings.max_tokens,
            timeout=self._settings.timeout_seconds,
        )
        report(65, 'Generating chapter draft')
        try:
            content = invoke_with_cleaning(adapter, prompt)
        except Exception:
            # A confirmed chapter plan is sufficient to provide an editable
            # starting draft when the upstream model rejects a long prompt.
            report(78, 'Using starter chapter draft')
            content = self._starter_chapter_draft(project.title, chapter_plan)
        if not content:
            raise RuntimeError('Chapter draft generation returned empty content')
        output.write_text(content, encoding='utf-8')
        fact_changes: list[dict[str, str | float]] = []
        try:
            report(85, 'Extracting fact changes')
            consistency_adapter = create_llm_adapter(
                interface_format=self._settings.interface_format,
                base_url=self._settings.base_url,
                model_name=self._settings.model_consistency_review,
                api_key=self._settings.api_key,
                temperature=self._settings.temperature,
                max_tokens=self._settings.max_tokens,
                timeout=self._settings.timeout_seconds,
            )
            fact_changes = self._extract_fact_changes(
                consistency_adapter,
                chapter_plan,
                content,
                invoke_with_cleaning,
            )
            self._write_json(fact_changes_path, {'factChanges': fact_changes})
        except Exception as error:
            # Fact suggestions are advisory. A failed extraction must never
            # discard an otherwise valid immutable chapter draft.
            logging.getLogger(__name__).warning(
                'Fact extraction failed for chapter draft run=%s: %s',
                run_id,
                error,
            )
        return {'chapterDraft': content, 'factChanges': fact_changes}

    @staticmethod
    def _starter_chapter_draft(project_title: str, chapter_plan) -> str:
        characters = '、'.join(chapter_plan.characters) or '主角'
        return (
            f'《{project_title}》\n\n'
            f'{chapter_plan.title}\n\n'
            f'{chapter_plan.location}在夜色里显得比白天更安静。{characters}都知道，'
            f'今夜必须完成一件事：{chapter_plan.goal}\n\n'
            f'风声掠过空处，{chapter_plan.conflict or "每个人都在隐藏自己的答案。"}'
            f'时间并不站在他们这一边，{chapter_plan.timeConstraint or "天亮前必须作出选择。"}\n\n'
            f'线索指向一个没人愿意提起的旧秘密。{chapter_plan.foreshadowing or "那份沉默的记录仍在等待被发现。"}'
            f'当他们以为已经找到出口时，{chapter_plan.hook or "新的疑问却在眼前出现。"}'
        )

    def review_consistency(
        self,
        novel_setting: str,
        character_state: str,
        global_summary: str,
        chapter_text: str,
        plot_arcs: str = '',
    ) -> str:
        """LLM consistency check of the latest chapter vs setting/state/summary.

        Uses the dedicated consistency-review role model. Returns the model's
        natural-language report (or '无明显冲突' when nothing is found).
        """
        from consistency_checker import check_consistency

        return check_consistency(
            novel_setting=novel_setting,
            character_state=character_state,
            global_summary=global_summary,
            chapter_text=chapter_text,
            api_key=self._settings.api_key,
            base_url=self._settings.base_url,
            model_name=self._settings.model_consistency_review,
            temperature=0.3,
            plot_arcs=plot_arcs,
            interface_format=self._settings.interface_format,
            max_tokens=self._settings.max_tokens,
            timeout=self._settings.timeout_seconds,
        )

    def enrich_chapter(self, chapter_text: str, target_words: int) -> str:
        """Expand chapter text toward target_words while keeping the plot coherent.

        Uses the chapter-draft role model (prose generation).
        """
        from novel_generator.finalization import enrich_chapter_text

        return enrich_chapter_text(
            chapter_text=chapter_text,
            word_number=target_words,
            api_key=self._settings.api_key,
            base_url=self._settings.base_url,
            model_name=self._settings.model_chapter_draft,
            temperature=self._settings.temperature,
            interface_format=self._settings.interface_format,
            max_tokens=self._settings.max_tokens,
            timeout=self._settings.timeout_seconds,
        )

    def parse_blueprint(self, blueprint_text: str) -> list[dict[str, Any]]:
        """Parse a chapter blueprint into structured per-chapter info (no LLM).

        Returns a list of dicts (chapter_number/title/role/purpose/...). Pure
        parsing; safe to run synchronously.
        """
        from chapter_directory_parser import parse_chapter_blueprint

        return parse_chapter_blueprint(blueprint_text)

    def summarize_recent_chapters(
        self,
        chapters_text_list: list[str],
        chapter_number: int,
        chapter_info: dict[str, Any],
        next_chapter_info: dict[str, Any],
    ) -> str:
        """Summarize recent chapters into precise context for the current chapter.

        Uses the outline role model (distillation/structuring). chapter_info /
        next_chapter_info match the ParsedChapter shape produced by parse_blueprint.
        """
        from novel_generator.chapter import summarize_recent_chapters as _summarize

        return _summarize(
            interface_format=self._settings.interface_format,
            api_key=self._settings.api_key,
            base_url=self._settings.base_url,
            model_name=self._settings.model_outline,
            temperature=self._settings.temperature,
            max_tokens=self._settings.max_tokens,
            chapters_text_list=chapters_text_list,
            novel_number=chapter_number,
            chapter_info=chapter_info,
            next_chapter_info=next_chapter_info,
            timeout=self._settings.timeout_seconds,
        )

    # ---- Knowledge / RAG -------------------------------------------------------
    # The vectorstore is project-scoped: <storage_root>/<project_id>/vectorstore/.
    # It is shared across runs so imported lore/context outlives any single job.

    def _knowledge_filepath(self, project_id: UUID) -> str:
        return str(self._settings.storage_root / str(project_id))

    def _require_embedding_adapter(self):
        adapter = self._settings.build_embedding_adapter()
        if adapter is None:
            raise RuntimeError(
                'Embedding is not configured (set EMBEDDING_ENDPOINT / EMBEDDING_APPKEY)'
            )
        return adapter

    def import_knowledge(self, project_id: UUID, content: str) -> None:
        """Split content into chunks and upsert into the project vectorstore."""
        adapter = self._require_embedding_adapter()
        from novel_generator.vectorstore_utils import update_vector_store
        update_vector_store(adapter, content, self._knowledge_filepath(project_id))

    def query_knowledge(self, project_id: UUID, query: str, k: int) -> str:
        """Retrieve up to k relevant chunks for the query ('' if none/no store)."""
        adapter = self._require_embedding_adapter()
        from novel_generator.vectorstore_utils import get_relevant_context_from_vector_store
        return get_relevant_context_from_vector_store(
            adapter, query, self._knowledge_filepath(project_id), k
        )

    def clear_knowledge(self, project_id: UUID) -> bool:
        """Remove the project vectorstore. False if there was nothing to clear."""
        from novel_generator.vectorstore_utils import clear_vector_store
        return clear_vector_store(self._knowledge_filepath(project_id))

    def generate_chapter_draft_full(
        self,
        project,
        blueprint,
        chapter_plan,
        run_id: UUID,
        report: Callable[[int, str], None],
    ) -> dict[str, Any]:
        """Full orchestrated chapter draft: build_chapter_prompt (RAG + summary) + LLM.

        Materializes the blueprint into the project-scoped workspace so the file-based
        pipeline (which reads Novel_architecture/directory + prior chapters) works.
        The workspace is shared across runs, so chapters accumulate: call this for
        ch1, then ch2, ... and each later chapter sees prior chapters/chapter_*.txt.
        """
        if not self._settings.api_key:
            raise RuntimeError('LLM_API_KEY must be configured')

        from novel_generator.chapter import generate_chapter_draft

        workspace = self._settings.storage_root / str(project.id)
        workspace.mkdir(parents=True, exist_ok=True)
        # Materialize blueprint (idempotent; overwrites so the latest confirmed inputs win).
        (workspace / 'Novel_architecture.txt').write_text(blueprint.architecture, encoding='utf-8')
        if getattr(blueprint, 'outline', ''):
            (workspace / 'Novel_directory.txt').write_text(blueprint.outline, encoding='utf-8')

        report(40, 'Building chapter prompt (context + RAG)')
        s = self._settings
        guidance = (project.guidance or '').strip()
        if getattr(chapter_plan, 'goal', ''):
            guidance = (guidance + ' | ' + chapter_plan.goal).strip(' |')

        content = generate_chapter_draft(
            api_key=s.api_key,
            base_url=s.base_url,
            model_name=s.model_chapter_draft,
            filepath=str(workspace),
            novel_number=chapter_plan.chapterNumber,
            word_number=project.targetWordsPerChapter,
            temperature=s.temperature,
            user_guidance=guidance,
            characters_involved=', '.join(chapter_plan.characters) if chapter_plan.characters else '',
            key_items=getattr(chapter_plan, 'foreshadowing', '') or '',
            scene_location=chapter_plan.location or '',
            time_constraint=chapter_plan.timeConstraint or '',
            embedding_api_key=s.embedding_appkey,
            embedding_url=s.embedding_endpoint,
            embedding_interface_format=s.embedding_interface_format,
            embedding_model_name=s.embedding_model,
            embedding_retrieval_k=s.embedding_retrieval_k,
            interface_format=s.interface_format,
            max_tokens=s.max_tokens,
            timeout=s.timeout_seconds,
        )
        if not content.strip():
            raise RuntimeError('Chapter draft generation returned empty content')
        report(90, 'Chapter draft generated')
        return {'chapterDraft': content}

    @staticmethod
    def _read_fact_changes(path: Path) -> list[dict[str, str | float]]:
        if not path.exists():
            return []
        try:
            payload = json.loads(path.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            return []
        fact_changes = payload.get('factChanges') if isinstance(payload, dict) else None
        return fact_changes if isinstance(fact_changes, list) else []

    @staticmethod
    def _chapter_draft_prompt(project, blueprint, plan, prompt_instruction: str) -> str:
        return f'''你是一名中文长篇小说写作助手。请只输出第 {plan.chapterNumber} 章正文，不要解释写作过程，不要输出提纲。

项目：{project.title}
类型：{project.genre}
总前提：{project.premise}
全局写作要求：{project.guidance}

已确认创作蓝图：
{blueprint.architecture}

已确认目录：
{blueprint.outline}

本章已确认计划：
标题：{plan.title}
目标：{plan.goal}
冲突：{plan.conflict}
人物：{', '.join(plan.characters)}
地点：{plan.location}
时间限制：{plan.timeConstraint}
伏笔：{plan.foreshadowing}
章末钩子：{plan.hook}

作者本次附加要求：{prompt_instruction or '无'}

请严格遵守本章计划。正文应当完整、有场景推进，并在结尾自然落到本章钩子。'''

    @staticmethod
    def _extract_fact_changes(adapter, chapter_plan, content: str, invoke) -> list[dict[str, str | float]]:
        prompt = f'''请从以下第 {chapter_plan.chapterNumber} 章草稿中提取最多 12 条可供作者确认的新增事实。
只提取正文明确陈述的角色状态、物品、地点、时间事件、设定或伏笔；不要猜测，不要复述纯描写。
只返回 JSON 数组，不要返回 Markdown。每个对象必须包含：
operation（固定为 "add"）、factType、subject、predicate、proposedValue、rationale、evidence、confidence。
evidence 必须是正文中的短句，rationale 说明为何值得作为后文依据。
confidence 是 0 到 1 的数字，只反映正文证据的明确程度；不确定时取低值。

章节标题：{chapter_plan.title}
正文：
{content}'''
        raw = invoke(adapter, prompt)
        return GenerationEngine._parse_fact_changes(raw)

    @staticmethod
    def _parse_fact_changes(raw: str) -> list[dict[str, str | float]]:
        candidate = raw.strip()
        try:
            decoded = json.loads(candidate)
        except json.JSONDecodeError:
            start = candidate.find('[')
            end = candidate.rfind(']')
            if start < 0 or end <= start:
                return []
            try:
                decoded = json.loads(candidate[start:end + 1])
            except json.JSONDecodeError:
                return []
        if not isinstance(decoded, list):
            return []

        proposals: list[dict[str, str | float]] = []
        for item in decoded[:12]:
            if not isinstance(item, dict):
                continue
            try:
                confidence = float(item.get('confidence', 0.5))
            except (TypeError, ValueError):
                confidence = 0.5
            if not math.isfinite(confidence):
                confidence = 0.5
            proposal = {
                'operation': 'add',
                'factType': str(item.get('factType', '')).strip()[:80],
                'subject': str(item.get('subject', '')).strip()[:200],
                'predicate': str(item.get('predicate', '')).strip()[:200],
                'proposedValue': str(item.get('proposedValue', '')).strip()[:20_000],
                'rationale': str(item.get('rationale', '')).strip()[:4_000],
                'evidence': str(item.get('evidence', '')).strip()[:10_000],
                'confidence': max(0.0, min(1.0, confidence)),
            }
            if all(proposal[field] for field in ('factType', 'subject', 'predicate', 'proposedValue', 'evidence')):
                proposals.append(proposal)
        return proposals

    @staticmethod
    def _read_output(path: Path) -> str:
        if not path.exists():
            raise RuntimeError(f'Expected generation output was not produced: {path.name}')
        return path.read_text(encoding='utf-8')
