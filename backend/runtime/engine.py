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

    @classmethod
    def from_environment(cls) -> 'RuntimeSettings':
        shared_secret = os.environ.get('NOVEL_RUNTIME_SHARED_SECRET', '')
        if not shared_secret:
            raise RuntimeError('NOVEL_RUNTIME_SHARED_SECRET must be configured')
        return cls(
            storage_root=Path(os.environ.get('PROJECT_STORAGE_ROOT', '/data/projects')),
            shared_secret=shared_secret,
            api_key=os.environ.get('LLM_API_KEY', ''),
            base_url=os.environ.get('LLM_BASE_URL', 'https://api.openai.com/v1'),
            model=os.environ.get('LLM_MODEL', 'gpt-4.1-mini'),
            interface_format=os.environ.get('LLM_INTERFACE_FORMAT', 'OpenAI'),
            temperature=float(os.environ.get('LLM_TEMPERATURE', '0.7')),
            max_tokens=int(os.environ.get('LLM_MAX_TOKENS', '8192')),
            timeout_seconds=int(os.environ.get('LLM_TIMEOUT_SECONDS', '600')),
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
                llm_model=self._settings.model,
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
                Chapter_blueprint_generate(
                    interface_format=self._settings.interface_format,
                    api_key=self._settings.api_key,
                    base_url=self._settings.base_url,
                    llm_model=self._settings.model,
                    filepath=str(workspace),
                    number_of_chapters=project.chapterCount,
                    user_guidance=project.guidance,
                    temperature=self._settings.temperature,
                    max_tokens=self._settings.max_tokens,
                    timeout=self._settings.timeout_seconds,
                )
            artifact['outline'] = self._read_output(outline_path)
        return artifact

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
            model_name=self._settings.model,
            api_key=self._settings.api_key,
            temperature=self._settings.temperature,
            max_tokens=self._settings.max_tokens,
            timeout=self._settings.timeout_seconds,
        )
        report(65, 'Generating chapter draft')
        content = invoke_with_cleaning(adapter, prompt)
        if not content:
            raise RuntimeError('Chapter draft generation returned empty content')
        output.write_text(content, encoding='utf-8')
        fact_changes: list[dict[str, str | float]] = []
        try:
            report(85, 'Extracting fact changes')
            fact_changes = self._extract_fact_changes(
                adapter,
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
