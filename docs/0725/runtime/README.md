# NestJS ↔ Python Runtime：暴露 100% AI 编排能力方案

> 日期：2025-07-25
> 范围：将 Python 端（AI 写小说项目）的全部编排能力通过 HTTP 暴露给 NestJS，形成一套完整的小说生产服务体系。
> 状态：**设计提案（待评审）** —— 本文档不含代码改动，仅输出架构与实施计划。

---

## 1. 背景与目标

Python 项目 `backend/` 是一个完整的 AI 写小说引擎，包含多模型编排、知识库 RAG、章节生成、扩写、一致性校验等能力。但目前 NestJS 只能调用其中一小部分（架构 / 大纲 / 简化版章节草稿 / 简化版定稿 / 正则硬事实校验）。

**目标**：让 NestJS（Studio 模块）能够调用 Python 端 **100% 的 AI 编排能力**，使「写小说」成为端到端、可编排、可观测的完整服务体系，而不只是「一个能生成文本的服务」。

---

## 2. 现状：桥已是契约驱动，但很薄

```
Python runtime/api.py (FastAPI :18080)
        ▲  shared-secret (x-runtime-secret) + Zod 契约
        │
NovelRuntimeClient  (apps/api/src/clients/novel-runtime/)
        │
Studio 模块  (apps/api/src/modules/studio/)  + cron(studio-generation / studio-finalization)
```

- Python 侧：`backend/runtime/api.py` + `backend/runtime/engine.py`
- NestJS 侧：`apps/api/src/clients/novel-runtime/novel-runtime.client.ts`（`@nestjs/axios` + Zod 校验）
- 契约：`@repo/contracts`（`GenerationJobSchema`、`StudioBlueprintSchema`、`StudioChapterPlanSchema`…）
- 已是 **Zod-first 契约 + shared-secret** 模式，扩展只需沿用既有范式。

### 当前已暴露的能力

| Python 端点 | NestJS 客户端方法 | 性质 |
|---|---|---|
| `POST /v1/generation-jobs` (kind=blueprint) | `createJob` | LLM：架构 + 大纲 |
| `POST /v1/generation-jobs` (kind=chapter_draft) | `createChapterDraftJob` | LLM：**简化版**章节草稿 |
| `GET /v1/generation-jobs/{id}` | `getJob` | 任务状态 |
| `POST /v1/generation-jobs/{id}/retry` `/cancel` | `retryJob` / `cancelJob` | 任务控制 |
| `POST /v1/finalization-tasks` | `executeFinalizationTask` | LLM：**简化版** summary/index |
| `POST /v1/reviews/hard-facts` | `reviewHardFacts` | **纯正则**，非 LLM |

---

## 3. Python 能力全景 + 差距矩阵

> 来源：`backend/novel_generator/__init__.py` 导出 + 各模块 public 函数。

| 编排能力 | Python 函数 (file:line) | 当前暴露 | 是否依赖 embedding | 是否依赖文件系统 |
|---|---|---|---|---|
| 故事架构生成 | `Novel_architecture_generate` (architecture.py:49) | ✅ blueprint job | 否 | 是(filepath) |
| 章节大纲生成 | `Chapter_blueprint_generate` (blueprint.py:50) | ✅ blueprint job | 否 | 是 |
| **章节草稿（简化版）** | `engine._chapter_draft_prompt`+`invoke_with_cleaning` (engine.py) | ⚠️ 部分 | 否 | 是 |
| **章节草稿（完整编排版）** | `generate_chapter_draft` (chapter.py:526) | ✅ job `kind=chapter_draft_full` | **是** | 是 |
| 构造章节提示词 | `build_chapter_prompt` (chapter.py:285) | ✅ 随 `chapter_draft_full` 内部落地 | 是 | 是 |
| 前文摘要（LLM） | `summarize_recent_chapters` (chapter.py:42) | ✅ `POST /v1/chapters/summarize-recent` | 否 | 否(传文本) |
| 取最近 N 章正文 | `get_last_n_chapters_text` (chapter.py:27) | ❌ | 否 | 是 |
| 知识库导入 | `import_knowledge_file` (knowledge.py:51) | ✅ `POST /v1/knowledge/import` | **是** | 是 |
| 向量库初始化/加载/更新 | `init/load/update_vector_store` (vectorstore_utils.py) | ✅（由 import/clear 驱动） | **是** | 是 |
| 相关上下文检索 | `get_relevant_context_from_vector_store` (vectorstore_utils.py:206) | ✅ `POST /v1/knowledge/query` | **是** | 是 |
| 知识上下文过滤 | `get_filtered_knowledge_context` (chapter.py:218) | ❌ | **是** | 是 |
| 清空向量库 | `clear_vector_store` (vectorstore_utils.py:33) | ✅ `DELETE /v1/knowledge/{projectId}` | 否 | 是 |
| **章节定稿（完整版）** | `finalize_chapter` (finalization.py:37) | ✅ job `kind=finalize_full` | **是** | 是 |
| 章节定稿（简化 summary/index） | `engine.execute_finalization_task` | ⚠️ 部分 | 否 | 否 |
| **章节扩写** | `enrich_chapter_text` (finalization.py:115) | ✅ `POST /v1/chapters/enrich` | 否 | 否(传文本) |
| **一致性校验（LLM）** | `check_consistency` (consistency_checker.py:27) | ✅ `POST /v1/reviews/consistency` | 否 | 否(传文本) |
| 硬事实校验（正则） | `api.py` 内联 | ✅ | 否 | 否 |
| 蓝图解析为章节信息 | `parse_chapter_blueprint` / `get_chapter_info_from_blueprint` (chapter_directory_parser.py) | ✅ `POST /v1/chapters/parse-blueprint` | 否 | 否(传文本) |

### 差距结论

1. **章节草稿是「阉割版」**：runtime 现在自建 prompt 直接调一次 LLM，**没有** 知识检索 / 前文摘要 / 内容规则过滤；完整版 `generate_chapter_draft` 才是真正的编排。
2. **知识库 / RAG 全链路完全未接**（导入、检索、过滤、向量库管理）。
3. **扩写、LLM 一致性校验、完整定稿** 未暴露。
4. **embedding 配置缺失**：RuntimeSettings 没有 embedding 字段，知识库链路无法运行。

---

## 4. 目标架构

两条互补的 API 风格，沿用既有模式：

### 4.1 高层编排任务（异步 + checkpoint + 进度）
扩展现有 `/v1/generation-jobs` 的 `kind` 枚举，承接重计算、长耗时、需要进度上报与断点恢复的能力：

- `blueprint`（已有：架构 + 大纲）
- `chapter_draft_full`（**新**：完整编排版 = RAG 检索 + 前文摘要 + 规则过滤 + 生成）
- `finalize_full`（**新**：完整定稿 = 向量库更新 + 摘要）
- `enrich`（**新**：扩写至目标字数）

> 复用现有 job 生命周期（queued/running/succeeded/failed/cancelled）、checkpoint、retry/cancel。

### 4.2 低层同步端点（即时、细粒度）
供 NestJS 按需直接调用、快速返回的能力：

- 知识库：导入 / 检索 / 列出 / 清空
- 蓝图解析：`parse_chapter_blueprint`
- 前文摘要：`summarize_recent_chapters`
- 提示词预览：`build_chapter_prompt`（dry-run，便于前端调试）
- LLM 一致性校验：`check_consistency`

### 4.3 桥的对称扩展

```
Python: runtime/api.py 新端点 + engine.py 新方法（薄封装 novel_generator.*）
   ↕  Zod 契约 + shared-secret
NestJS: NovelRuntimeClient 新方法 + @repo/contracts 新 schema
   ↕
Studio 模块 / cron 编排
```

---

## 5. 环境配置（前置）

| 变量 | 用途 | 默认/说明 |
|---|---|---|
| `LLM_*` / `LLM_MODEL_*` | 已完成：分角色大模型（架构/大纲/草稿/一致性） | 见 `backend/.env` |
| `EMBEDDING_ENDPOINT` | **新增**：嵌入端点（完整 URL） | 火山 `/api/v3/embeddings/multimodal` |
| `EMBEDDING_APPKEY` | **新增**：嵌入 appkey | Ark API Key |
| `EMBEDDING_MODEL` | **新增**：嵌入模型名 | `doubao-embedding-vision-250615` |
| `EMBEDDING_INTERFACE_FORMAT` | **新增**：适配器路由键 | `volcengine-multimodal`（已实现专用适配器） |
| `EMBEDDING_RETRIEVAL_K` | **新增**：检索 top-k | 默认 4 |

RuntimeSettings 已加 `embedding_*` 字段 + `build_embedding_adapter()`（懒加载）；`scripts/start-local-services.js` 的转发正则已扩展到含 `EMBEDDING_`。

> ✅ **决策点 A（embedding 提供方）——已决定**：采用火山引擎 Ark **多模态**嵌入
> `doubao-embedding-vision-250615`（`/api/v3/embeddings/multimodal`）。
> 因多模态端点请求/响应 schema 与 OpenAI 文本嵌入不兼容，已新增专用 `VolcengineMultimodalEmbeddingAdapter`
> 并在 `create_embedding_adapter` 按 `EMBEDDING_INTERFACE_FORMAT=volcengine-multimodal` 路由；
> `RuntimeSettings.build_embedding_adapter()` 读取 `.env` 并按需懒加载。
> 已对真实端点端到端验证（2048 维，余弦相似度可用）。
> 备注：小说知识库为纯文本场景，多模态嵌入可用但偏重；若后续要降本，可切 Ark 文本嵌入（`doubao-embedding-text-*` 走 `/api/v3/embeddings`，直接复用 `OpenAIEmbeddingAdapter`，零新代码）。

---

## 6. API 设计（拟）

### 6.1 Python `runtime/api.py` 新端点

#### 高层 job（扩展 `kind`）
```http
POST /v1/generation-jobs
{ kind: "chapter_draft_full", project, blueprint, chapterPlan, knowledgeRefs?, prompt }
{ kind: "enrich",             project, content, targetWords }
{ kind: "finalize_full",      project, blueprint, chapterPlan, content }
```

#### 低层同步
```http
POST /v1/knowledge/import       # multipart 或 JSON {projectId, fileName, content}
POST /v1/knowledge/query        # {projectId, query, k} → 相关片段
GET  /v1/knowledge/{projectId}  # 列出已导入
DELETE /v1/knowledge/{projectId}# 清空向量库

POST /v1/chapters/parse-blueprint   # {blueprintText} → 结构化章节信息
POST /v1/chapters/summarize-recent  # {chaptersText[], chapterInfo} → 摘要
POST /v1/chapters/preview-prompt    # {project, chapterPlan} → 提示词（dry-run）
POST /v1/reviews/consistency        # {novelSetting, characterState, globalSummary, chapterText, plotArcs?} → 校验报告
```

#### engine.py 映射
| engine 新方法 | 包装的 novel_generator 函数 |
|---|---|
| `generate_chapter_draft_full` | `build_chapter_prompt` + RAG(`get_relevant_context_from_vector_store` / `get_filtered_knowledge_context`) + `summarize_recent_chapters` + `generate_chapter_draft` |
| `finalize_chapter_full` | `finalize_chapter` |
| `enrich_chapter` | `enrich_chapter_text` |
| `import_knowledge` / `query_knowledge` / `clear_knowledge` | `import_knowledge_file` / `get_relevant_context_from_vector_store` / `clear_vector_store` |
| `check_consistency` | `consistency_checker.check_consistency` |

> 文件系统约定：沿用 `workspace_for(project_id, run_id)`；知识库向量库落在 `workspace/.vectorstore/`。

### 6.2 NestJS `NovelRuntimeClient` 新方法（对称）
```ts
createChapterDraftFullJob(...)   enrichJob(...)   finalizeFullJob(...)
importKnowledge(...)   queryKnowledge(...)   listKnowledge(...)   clearKnowledge(...)
parseBlueprint(...)   summarizeRecentChapters(...)   previewChapterPrompt(...)
reviewConsistency(...)
```
每个方法：Zod 校验入参 → `request(...)` → Zod 校验响应（完全沿用 [novel-runtime.client.ts](../../../apps/api/src/clients/novel-runtime/novel-runtime.client.ts) 既有模式）。

### 6.3 `@repo/contracts` 新 schema
- `StudioKnowledgeChunkSchema` / `KnowledgeQueryResponseSchema`
- `ParsedBlueprintSchema` / `ChapterInfoSchema`
- `ChapterPromptPreviewSchema`
- `ConsistencyReviewResultSchema`
- `EnrichJobRequestSchema` / `FinalizeFullJobRequestSchema`
- 扩展 `GenerationJobKindSchema` 枚举

---

## 7. 端到端数据流（完整章节生产）

```
NestJS Studio
  │ 1. createJob(kind=blueprint) ──────────────▶ Python: 架构 + 大纲
  │ 2. parseBlueprint(blueprintText) ──────────▶ Python: 结构化章节信息
  │ 3. importKnowledge(项目资料) ───────────────▶ Python: 切分 + 嵌入 + 向量库
  │ 4. 逐章 createChapterDraftFullJob:
  │      ├─ summarizeRecentChapters(前 N 章)   ▶ 上下文摘要
  │      ├─ queryKnowledge(本章关键词)         ▶ RAG 片段
  │      ├─ generate_chapter_draft(完整编排)   ▶ 章节正文
  │      └─ reviewConsistency(正文)            ▶ 一致性报告
  │ 5. enrichJob(字数不足时扩写)
  │ 6. finalizeFullJob(定稿 + 向量库更新)
```

---

## 8. 分阶段实施计划

| 阶段 | 内容 | 依赖 |
|---|---|---|
| **P0 前置** | embedding 环境变量 + RuntimeSettings + adapter 装配；start 脚本透传 `EMBEDDING_*` | 决策点 A |
| **P1 不依赖 embedding 的能力** | ✅ **已完成（4/4）**：`review-consistency` / `enrich` / `parse-blueprint` / `summarize-recent` 端点 + 客户端 + 契约 + 测试。原 `preview-prompt` 经核实是 `build_chapter_prompt` 的内部步骤（读工作区文件 + RAG + LLM），已归入 P3。 | 无 |
| **P2 知识库 / RAG** | ✅ **已完成**：`knowledge/import` · `query` · `clear`（按 projectId 隔离，复用 build_embedding_adapter + chroma）。`list/stats` 暂缓。 | P0 |
| **P3 完整编排生成** | ✅ **已完成**：`chapter_draft_full`（完整草稿：build_chapter_prompt + RAG + 摘要 + LLM）+ `finalize_full`（更新 global_summary/character_state + 并入向量库）。章节跨 job 累积，构成完整顺序写作循环。 | P0、P2 |
| **P4 NestJS Studio 接线** | Studio 服务 + cron 编排完整流水线；前端调用 | P1–P3 |
| **P5 收尾** | 灰度切换、文档、契约版本兼容、观测（已有 checkpoint） | — |

> 建议先落地 **P1**（零依赖、立即可用、覆盖 5 个能力），再做 **决策点 A** 决定 embedding 后推进 P2/P3。

---

## 9. 风险与决策点

| 项 | 说明 | 建议 |
|---|---|---|
| **A. embedding 缺失** | 网关无文本嵌入模型，RAG 链路无法跑 | 优先让网关补嵌入模型；否则 P2/P3 阻塞 |
| **B. 简化版↔完整版并存** | 现有 chapter_draft 简化版是否保留 | 新增 `chapter_draft_full` 与之并存，灰度后下线简化版 |
| **C. 文件系统耦合** | novel_generator 大量读写 workspace 文件 | 沿用 `workspace_for(project_id, run_id)`；多实例横向扩展需共享存储（后续） |
| **D. 多模型参数透传** | 完整版函数需 base_url/key/model/interface_format | 统一从 RuntimeSettings 注入，分角色复用 `LLM_MODEL_*` |
| **E. 长任务超时** | NestJS 客户端原 timeout 15s | ✅ 已解决：`request()` 支持按调用超时；同步 LLM 端点(enrich/summarize/consistency)用 `NOVEL_RUNTIME_LLM_TIMEOUT_MS`(默认 120s)，其余用 `NOVEL_RUNTIME_TIMEOUT_MS`(默认 15s)；超长任务仍建议走 job |

---

## 10. 不在本方案范围

- 桌面 GUI（`backend/ui/` + `config_manager.py` + `config.example.json`）保持独立，不改。
- Python 端算法/提示词逻辑本身（`prompt_definitions.py` 等）不做重构，仅做 HTTP 包装。
- 不引入新的进程间通信机制（继续 HTTP + shared-secret）。
