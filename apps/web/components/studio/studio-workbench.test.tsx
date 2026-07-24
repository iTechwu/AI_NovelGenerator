import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudioWorkbench } from "./studio-workbench";

const {
  confirmChapterPlan,
  compareChapterRevisions,
  createChapterDraft,
  createFactChange,
  createProject,
  getBlueprint,
  getChapterPlan,
  listChapterRevisions,
  listFacts,
  listFactChanges,
  resolveFactChange,
  restoreChapterRevision,
  getJob,
  listProjects,
  saveChapterPlan,
  updateBlueprint,
} = vi.hoisted(() => ({
  confirmChapterPlan: vi.fn(),
  compareChapterRevisions: vi.fn(),
  createChapterDraft: vi.fn(),
  createFactChange: vi.fn(),
  createProject: vi.fn(),
  getBlueprint: vi.fn(),
  getChapterPlan: vi.fn(),
  listChapterRevisions: vi.fn(),
  listFacts: vi.fn(),
  listFactChanges: vi.fn(),
  resolveFactChange: vi.fn(),
  restoreChapterRevision: vi.fn(),
  getJob: vi.fn(),
  listProjects: vi.fn(),
  saveChapterPlan: vi.fn(),
  updateBlueprint: vi.fn(),
}));

vi.mock("@/lib/api/contracts/client", () => ({
  studioClient: {
    listProjects,
    createProject,
    getBlueprint,
    getJob,
    updateBlueprint,
    confirmBlueprint: vi.fn(),
    getChapterPlan,
    listChapterRevisions,
    listFacts,
    listFactChanges,
    createFactChange,
    resolveFactChange,
    restoreChapterRevision,
    saveChapterPlan,
    confirmChapterPlan,
    compareChapterRevisions,
    createChapterDraft,
  },
}));

vi.mock("@repo/ui", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  Progress: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

describe("StudioWorkbench", () => {
  beforeEach(() => {
    listProjects.mockReset();
    createProject.mockReset();
    getBlueprint.mockReset();
    getJob.mockReset();
    getChapterPlan.mockReset();
    listChapterRevisions.mockReset();
    listFacts.mockReset();
    listFactChanges.mockReset();
    createFactChange.mockReset();
    resolveFactChange.mockReset();
    restoreChapterRevision.mockReset();
    saveChapterPlan.mockReset();
    confirmChapterPlan.mockReset();
    compareChapterRevisions.mockReset();
    createChapterDraft.mockReset();
    updateBlueprint.mockReset();
    getChapterPlan.mockResolvedValue({ status: 404 });
    listChapterRevisions.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 20 } },
    });
    listFactChanges.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 50 } },
    });
    listFacts.mockResolvedValue({
      status: 200,
      body: { data: { list: [], total: 0, page: 1, limit: 100 } },
    });
    compareChapterRevisions.mockResolvedValue({
      status: 200,
      body: { data: { baseRevisionId: "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a", comparisonRevisionId: "ad6cbd8b-a144-41cb-b1d4-256b196f9c9c", segments: [] } },
    });
    listProjects.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [
            {
              id: "af46e9a4-574a-4d55-bb21-1d89a5f3acd1",
              title: "雾港来信",
              format: "novel",
              genre: "悬疑",
              chapterCount: 20,
              targetWordsPerChapter: 3000,
              createdAt: "2026-07-24T02:00:00.000Z",
              updatedAt: "2026-07-24T02:00:00.000Z",
              latestRun: {
                id: "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a",
                status: "running",
                progress: 55,
                currentStep: "Generating story architecture",
                updatedAt: "2026-07-24T02:00:00.000Z",
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

  it("loads the current author project library and shows its latest run state", async () => {
    render(<StudioWorkbench />);

    expect(await screen.findByText("雾港来信")).toBeInTheDocument();
    expect(screen.getByText("生成中")).toBeInTheDocument();
    expect(
      screen.getByText("Generating story architecture"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(listProjects).toHaveBeenCalledWith({
        query: { page: 1, limit: 20 },
      });
    });
  });

  it("loads the editable blueprint after a generation job succeeds", async () => {
    const projectId = "af46e9a4-574a-4d55-bb21-1d89a5f3acd1";
    createProject.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a",
          project: {
            id: projectId,
            title: "雾港来信",
            format: "novel",
            genre: "悬疑",
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: "succeeded",
          progress: 100,
          currentStep: "Generation complete",
          createdAt: "2026-07-24T02:00:00.000Z",
          updatedAt: "2026-07-24T02:00:00.000Z",
        },
      },
    });
    getBlueprint.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: "7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c",
          projectId,
          version: 1,
          status: "draft",
          architecture: "雾港的秘密由一封迟到的信件揭开。",
          outline: "第 1 章：信件抵达",
          source: "ai",
          schemaVersion: 1,
          createdAt: "2026-07-24T02:00:00.000Z",
          updatedAt: "2026-07-24T02:00:00.000Z",
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText("项目名称"), {
      target: { value: "雾港来信" },
    });
    fireEvent.change(screen.getByLabelText("故事梗概"), {
      target: { value: "一封迟到二十年的信件，让雾港的失踪案重新浮出水面。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成故事架构" }));

    expect(await screen.findByText("创作蓝图")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("雾港的秘密由一封迟到的信件揭开。"),
    ).toBeInTheDocument();
    expect(getBlueprint).toHaveBeenCalledWith({ params: { projectId } });
  });

  it("creates a new draft when an author edits a confirmed blueprint", async () => {
    const projectId = "af46e9a4-574a-4d55-bb21-1d89a5f3acd1";
    createProject.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a",
          project: {
            id: projectId,
            title: "雾港来信",
            format: "novel",
            genre: "悬疑",
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: "succeeded",
          progress: 100,
          currentStep: "Generation complete",
          createdAt: "2026-07-24T02:00:00.000Z",
          updatedAt: "2026-07-24T02:00:00.000Z",
        },
      },
    });
    getBlueprint.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: "7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c",
          projectId,
          version: 1,
          status: "confirmed",
          architecture: "初始架构",
          outline: "初始目录",
          source: "ai",
          schemaVersion: 1,
          createdAt: "2026-07-24T02:00:00.000Z",
          updatedAt: "2026-07-24T02:00:00.000Z",
        },
      },
    });
    updateBlueprint.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: "227dd8ce-b405-4609-bffc-e88f8842e1ab",
          projectId,
          version: 2,
          status: "draft",
          architecture: "修订后的架构",
          outline: "初始目录",
          source: "author",
          schemaVersion: 1,
          createdAt: "2026-07-24T02:00:00.000Z",
          updatedAt: "2026-07-24T02:00:00.000Z",
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText("项目名称"), {
      target: { value: "雾港来信" },
    });
    fireEvent.change(screen.getByLabelText("故事梗概"), {
      target: { value: "一封迟到二十年的信件，让雾港的失踪案重新浮出水面。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成故事架构" }));

    expect(
      await screen.findByRole("button", { name: "创建修订版" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "创建修订版" }));
    fireEvent.change(screen.getByLabelText("故事架构"), {
      target: { value: "修订后的架构" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存蓝图" }));

    await waitFor(() => {
      expect(updateBlueprint).toHaveBeenCalledWith({
        params: { projectId },
        body: { architecture: "修订后的架构", outline: "初始目录" },
      });
    });
    expect(await screen.findByText("版本 2")).toBeInTheDocument();
  });

  it("saves a structured first chapter plan after the blueprint is confirmed", async () => {
    const projectId = "af46e9a4-574a-4d55-bb21-1d89a5f3acd1";
    createProject.mockResolvedValue({
      status: 202,
      body: {
        data: {
          id: "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a",
          project: {
            id: projectId,
            title: "雾港来信",
            format: "novel",
            genre: "悬疑",
            chapterCount: 20,
            targetWordsPerChapter: 3000,
          },
          status: "succeeded",
          progress: 100,
          currentStep: "Generation complete",
          createdAt: "2026-07-24T02:00:00.000Z",
          updatedAt: "2026-07-24T02:00:00.000Z",
        },
      },
    });
    getBlueprint.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: "7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c",
          projectId,
          version: 1,
          status: "confirmed",
          architecture: "初始架构",
          outline: "初始目录",
          source: "ai",
          schemaVersion: 1,
          createdAt: "2026-07-24T02:00:00.000Z",
          updatedAt: "2026-07-24T02:00:00.000Z",
        },
      },
    });
    saveChapterPlan.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: "227dd8ce-b405-4609-bffc-e88f8842e1ab",
          projectId,
          blueprintId: "7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c",
          chapterNumber: 1,
          version: 1,
          status: "draft",
          title: "信件抵达",
          goal: "让主角决定重查失踪案。",
          conflict: "",
          characters: ["林雾"],
          location: "",
          timeConstraint: "",
          foreshadowing: "",
          hook: "",
          source: "author",
          schemaVersion: 1,
          createdAt: "2026-07-24T02:00:00.000Z",
          updatedAt: "2026-07-24T02:00:00.000Z",
        },
      },
    });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText("项目名称"), {
      target: { value: "雾港来信" },
    });
    fireEvent.change(screen.getByLabelText("故事梗概"), {
      target: { value: "一封迟到二十年的信件，让雾港的失踪案重新浮出水面。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成故事架构" }));

    expect(await screen.findByText("章节计划")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("章节标题"), {
      target: { value: "信件抵达" },
    });
    fireEvent.change(screen.getByLabelText("本章目标"), {
      target: { value: "让主角决定重查失踪案。" },
    });
    fireEvent.change(screen.getByLabelText("出场人物"), {
      target: { value: "林雾" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存计划" }));

    await waitFor(() => {
      expect(saveChapterPlan).toHaveBeenCalledWith({
        params: { projectId, chapterNumber: 1 },
        body: {
          title: "信件抵达",
          goal: "让主角决定重查失踪案。",
          conflict: "",
          characters: ["林雾"],
          location: "",
          timeConstraint: "",
          foreshadowing: "",
          hook: "",
        },
      });
    });

    fireEvent.change(screen.getByLabelText("章节"), { target: { value: "2" } });
    await waitFor(() => {
      expect(screen.getByLabelText("章节标题")).toHaveValue("");
      expect(screen.getByLabelText("本章目标")).toHaveValue("");
    });
  });

  it("queues a draft from a confirmed chapter plan and renders its immutable snapshot", async () => {
    const projectId = "af46e9a4-574a-4d55-bb21-1d89a5f3acd1";
    const blueprint = {
      id: "7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c", projectId, version: 1,
      status: "confirmed", architecture: "初始架构", outline: "初始目录", source: "ai",
      schemaVersion: 1, createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    };
    const plan = {
      id: "227dd8ce-b405-4609-bffc-e88f8842e1ab", projectId, blueprintId: blueprint.id,
      chapterNumber: 1, version: 1, status: "confirmed", title: "信件抵达", goal: "重查旧案",
      conflict: "", characters: ["林雾"], location: "", timeConstraint: "", foreshadowing: "", hook: "",
      source: "author", schemaVersion: 1, createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    };
    createProject.mockResolvedValue({ status: 202, body: { data: {
      id: "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a", project: { id: projectId, title: "雾港来信", format: "novel", genre: "悬疑", chapterCount: 20, targetWordsPerChapter: 3000 },
      status: "succeeded", progress: 100, currentStep: "Generation complete", createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    } } });
    getBlueprint.mockResolvedValue({ status: 200, body: { data: blueprint } });
    getChapterPlan.mockResolvedValue({ status: 200, body: { data: plan } });
    createChapterDraft.mockResolvedValue({ status: 202, body: { data: {
      id: "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a", project: { id: projectId, title: "雾港来信", format: "novel", genre: "悬疑", chapterCount: 20, targetWordsPerChapter: 3000 },
      status: "succeeded", progress: 100, currentStep: "Generation complete", artifact: { chapterDraft: "雨声先于信件抵达。" }, revisionId: "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a", createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    } } });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "雾港来信" } });
    fireEvent.change(screen.getByLabelText("故事梗概"), { target: { value: "一封迟到二十年的信件，让雾港的失踪案重新浮出水面。" } });
    fireEvent.click(screen.getByRole("button", { name: "生成故事架构" }));
    expect(await screen.findByRole("button", { name: "生成本章草稿" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("本次附加要求"), { target: { value: "先写雨声。" } });
    fireEvent.click(screen.getByRole("button", { name: "生成本章草稿" }));

    await waitFor(() => expect(createChapterDraft).toHaveBeenCalledWith({
      params: { projectId, chapterNumber: 1 }, body: { prompt: "先写雨声。" },
    }));
    expect(await screen.findByLabelText("章节草稿快照")).toHaveValue("雨声先于信件抵达。");
  });

  it("restores a previous draft by switching the current draft pointer", async () => {
    const projectId = "af46e9a4-574a-4d55-bb21-1d89a5f3acd1";
    const latestRevisionId = "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a";
    const previousRevisionId = "ad6cbd8b-a144-41cb-b1d4-256b196f9c9c";
    const blueprint = {
      id: "7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c", projectId, version: 1,
      status: "confirmed", architecture: "初始架构", outline: "初始目录", source: "ai",
      schemaVersion: 1, createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    };
    const plan = {
      id: "227dd8ce-b405-4609-bffc-e88f8842e1ab", projectId, blueprintId: blueprint.id,
      chapterNumber: 1, version: 1, status: "confirmed", title: "信件抵达", goal: "重查旧案",
      conflict: "", characters: ["林雾"], location: "", timeConstraint: "", foreshadowing: "", hook: "",
      source: "author", schemaVersion: 1, createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    };
    const previousRevision = {
      id: previousRevisionId, projectId, chapterPlanId: plan.id, runId: previousRevisionId,
      chapterNumber: 1, version: 1, status: "draft", content: "第一版雨声。", wordCount: 1,
      promptSummary: "", source: "ai", schemaVersion: 1,
      createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    };
    const latestRevision = { ...previousRevision, id: latestRevisionId, runId: latestRevisionId, version: 2, content: "第二版雨声。" };
    createProject.mockResolvedValue({ status: 202, body: { data: {
      id: latestRevisionId, project: { id: projectId, title: "雾港来信", format: "novel", genre: "悬疑", chapterCount: 20, targetWordsPerChapter: 3000 },
      status: "succeeded", progress: 100, currentStep: "Generation complete", createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    } } });
    getBlueprint.mockResolvedValue({ status: 200, body: { data: blueprint } });
    getChapterPlan.mockResolvedValue({ status: 200, body: { data: plan } });
    listChapterRevisions.mockResolvedValue({ status: 200, body: { data: {
      list: [latestRevision, previousRevision], total: 2, page: 1, limit: 20,
      currentRevisionId: latestRevisionId,
    } } });
    compareChapterRevisions.mockResolvedValue({ status: 200, body: { data: {
      baseRevisionId: latestRevisionId, comparisonRevisionId: previousRevisionId,
      segments: [
        { type: "removed", text: "第二版雨声。" },
        { type: "added", text: "第一版雨声。" },
      ],
    } } });
    restoreChapterRevision.mockResolvedValue({ status: 200, body: { data: previousRevision } });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "雾港来信" } });
    fireEvent.change(screen.getByLabelText("故事梗概"), { target: { value: "一封迟到二十年的信件，让雾港的失踪案重新浮出水面。" } });
    fireEvent.click(screen.getByRole("button", { name: "生成故事架构" }));
    expect(await screen.findByText("草稿 v2")).toBeInTheDocument();
    expect(await screen.findByLabelText("草稿版本差异")).toHaveTextContent("第一版雨声。");
    await waitFor(() => expect(compareChapterRevisions).toHaveBeenCalledWith({
      params: { projectId, chapterNumber: 1, revisionId: latestRevisionId, comparisonRevisionId: previousRevisionId },
    }));
    fireEvent.click(screen.getByRole("button", { name: "恢复" }));

    await waitFor(() => expect(restoreChapterRevision).toHaveBeenCalledWith({
      params: { projectId, chapterNumber: 1, revisionId: previousRevisionId }, body: {},
    }));
    expect(await screen.findByDisplayValue("第一版雨声。")).toHaveAttribute("readonly");
  });

  it("submits a fact proposal without resolving it", async () => {
    const projectId = "af46e9a4-574a-4d55-bb21-1d89a5f3acd1";
    const revisionId = "d31f0d12-c8f6-49ac-9ae3-cb2a7c99815a";
    const blueprint = {
      id: "7bb1e809-c3c2-4ffc-9706-4bb0f8d3b44c", projectId, version: 1,
      status: "confirmed", architecture: "初始架构", outline: "初始目录", source: "ai",
      schemaVersion: 1, createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    };
    const plan = {
      id: "227dd8ce-b405-4609-bffc-e88f8842e1ab", projectId, blueprintId: blueprint.id,
      chapterNumber: 1, version: 1, status: "confirmed", title: "信件抵达", goal: "重查旧案",
      conflict: "", characters: ["林雾"], location: "", timeConstraint: "", foreshadowing: "", hook: "",
      source: "author", schemaVersion: 1, createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    };
    const revision = {
      id: revisionId, projectId, chapterPlanId: plan.id, runId: revisionId, chapterNumber: 1,
      version: 1, status: "draft", content: "林雾握紧信件。", wordCount: 1, promptSummary: "",
      source: "ai", schemaVersion: 1, createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    };
    createProject.mockResolvedValue({ status: 202, body: { data: {
      id: revisionId, project: { id: projectId, title: "雾港来信", format: "novel", genre: "悬疑", chapterCount: 20, targetWordsPerChapter: 3000 },
      status: "succeeded", progress: 100, currentStep: "Generation complete", createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    } } });
    getBlueprint.mockResolvedValue({ status: 200, body: { data: blueprint } });
    getChapterPlan.mockResolvedValue({ status: 200, body: { data: plan } });
    listChapterRevisions.mockResolvedValue({ status: 200, body: { data: {
      list: [revision], total: 1, page: 1, limit: 20, currentRevisionId: revisionId,
    } } });
    createFactChange.mockResolvedValue({ status: 201, body: { data: {
      id: "ad6cbd8b-a144-41cb-b1d4-256b196f9c9c", projectId, revisionId, chapterNumber: 1,
      operation: "add", factType: "character", subject: "林雾", predicate: "knows",
      proposedValue: "旧案线索", rationale: "", evidence: "林雾握紧信件。", source: "author", status: "proposed",
      createdAt: "2026-07-24T02:00:00.000Z", updatedAt: "2026-07-24T02:00:00.000Z",
    } } });

    render(<StudioWorkbench />);
    fireEvent.change(screen.getByLabelText("项目名称"), { target: { value: "雾港来信" } });
    fireEvent.change(screen.getByLabelText("故事梗概"), { target: { value: "一封迟到二十年的信件，让雾港的失踪案重新浮出水面。" } });
    fireEvent.click(screen.getByRole("button", { name: "生成故事架构" }));
    expect(await screen.findByText("事实建议")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("主体"), { target: { value: "林雾" } });
    fireEvent.change(screen.getByLabelText("关系或属性"), { target: { value: "knows" } });
    fireEvent.change(screen.getByLabelText("建议事实值"), { target: { value: "旧案线索" } });
    fireEvent.click(screen.getByRole("button", { name: "提交事实建议" }));

    await waitFor(() => expect(createFactChange).toHaveBeenCalledWith({
      params: { projectId, chapterNumber: 1, revisionId },
      body: {
        operation: "add", factType: "character", subject: "林雾", predicate: "knows",
        proposedValue: "旧案线索", rationale: "", evidence: "",
      },
    }));
    expect(await screen.findByText("待裁决")).toBeInTheDocument();
  });
});
