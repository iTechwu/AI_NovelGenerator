import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioScreenplayWorkspace } from './studio-screenplay-workspace';

const { listProjects, listScenes, listRevisions, saveScene, saveRevision } = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listScenes: vi.fn(),
  listRevisions: vi.fn(),
  saveScene: vi.fn(),
  saveRevision: vi.fn(),
}));

vi.mock('@/lib/api/contracts/client', () => ({
  studioClient: {
    listProjects,
    listStandaloneScreenplayScenes: listScenes,
    listStandaloneScreenplayRevisions: listRevisions,
    saveStandaloneScreenplayScene: saveScene,
    createStandaloneScreenplayRevision: saveRevision,
    exportStandaloneScreenplay: vi.fn(),
  },
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock('@repo/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

const projectId = 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1';
const sceneId = 'd2d9a23c-742e-4ea2-a83f-2bb5cf4b9a73';
const createdAt = '2026-07-26T10:00:00.000Z';

describe('StudioScreenplayWorkspace', () => {
  beforeEach(() => {
    listProjects.mockReset();
    listScenes.mockReset();
    listRevisions.mockReset();
    saveScene.mockReset();
    saveRevision.mockReset();
    listProjects.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [{ id: projectId, title: '雾港来信（剧本）', format: 'screenplay' }],
        },
      },
    });
    listScenes.mockResolvedValue({
      status: 200,
      body: {
        data: {
          list: [{
            id: sceneId,
            projectId,
            episodeNumber: 1,
            sceneNumber: 1,
            title: '匿名录像',
            synopsis: '林舟收到录像。',
            status: 'draft',
            createdAt,
            updatedAt: createdAt,
          }],
        },
      },
    });
    listRevisions.mockResolvedValue({ status: 200, body: { data: { list: [] } } });
    saveScene.mockResolvedValue({
      status: 200,
      body: {
        data: {
          id: sceneId,
          projectId,
          episodeNumber: 1,
          sceneNumber: 1,
          title: '匿名录像',
          synopsis: '林舟收到录像。',
          status: 'draft',
          createdAt,
          updatedAt: createdAt,
        },
      },
    });
    saveRevision.mockResolvedValue({
      status: 201,
      body: {
        data: {
          id: 'e4f80440-5d47-4416-964b-c8be511840d0',
          projectId,
          sceneId,
          version: 1,
          content: 'INT. 港口仓库 - 夜\n\n林舟检查录像机。',
          contentHash: 'a'.repeat(64),
          wordCount: 4,
          editSummary: null,
          createdAt,
        },
      },
    });
  });

  it('saves the selected scene plan before appending its Fountain revision', async () => {
    render(<StudioScreenplayWorkspace projectId={projectId} />);

    await screen.findByText('匿名录像');
    fireEvent.click(screen.getByRole('button', { name: '保存场景' }));
    await waitFor(() => {
      expect(saveScene).toHaveBeenCalledWith(
        expect.objectContaining({ params: { projectId }, body: expect.objectContaining({ title: '匿名录像' }) }),
      );
    });

    fireEvent.change(screen.getByPlaceholderText(/INT\. 港口仓库/), {
      target: { value: 'INT. 港口仓库 - 夜\n\n林舟检查录像机。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存为新版本' }));

    await waitFor(() => {
      expect(saveRevision).toHaveBeenCalledWith({
        params: { projectId, sceneId },
        body: { content: 'INT. 港口仓库 - 夜\n\n林舟检查录像机。' },
      });
    });
    expect(await screen.findByText('v1')).toBeInTheDocument();
  });

  it('blocks an invalid Fountain save before sending a revision request', async () => {
    render(<StudioScreenplayWorkspace projectId={projectId} />);

    await screen.findByText('匿名录像');
    fireEvent.change(screen.getByPlaceholderText(/INT\. 港口仓库/), {
      target: { value: '林舟检查录像机。' },
    });

    expect(screen.getByText(/请至少写一个场景头/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存为新版本' })).toBeDisabled();
    expect(saveRevision).not.toHaveBeenCalled();
  });
});
