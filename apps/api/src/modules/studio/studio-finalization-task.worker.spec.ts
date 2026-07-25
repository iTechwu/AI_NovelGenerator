import { StudioFinalizationTaskWorker } from './studio-finalization-task.worker';

describe('StudioFinalizationTaskWorker', () => {
  const taskService = {
    list: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  };
  const finalizationService = { update: jest.fn() };
  const revisionService = { getById: jest.fn() };
  const projectEventService = { create: jest.fn() };
  const runtimeClient = { executeFinalizationTask: jest.fn() };
  const logger = { error: jest.fn() };
  let worker: StudioFinalizationTaskWorker;

  const task = {
    id: 'd31f0d12-c8f6-49ac-9ae3-cb2a7c99815a',
    finalizationId: 'ad6cbd8b-a144-41cb-b1d4-256b196f9c9c',
    projectId: 'af46e9a4-574a-4d55-bb21-1d89a5f3acd1',
    revisionId: '98cc0808-e3d3-4313-b276-3c6608168f0a',
    chapterNumber: 1,
    type: 'SUMMARY' as const,
    attemptCount: 0,
    createdAt: new Date('2026-07-25T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    worker = new StudioFinalizationTaskWorker(
      taskService as never,
      finalizationService as never,
      revisionService as never,
      projectEventService as never,
      runtimeClient as never,
      logger as never,
    );
  });

  it('does not finalize until both outbox tasks have completed', async () => {
    taskService.updateMany.mockResolvedValue({ count: 1 });
    taskService.getById.mockResolvedValue(task);
    revisionService.getById.mockResolvedValue({
      id: task.revisionId,
      projectId: task.projectId,
      content: '林雾握紧信件。',
    });
    runtimeClient.executeFinalizationTask.mockResolvedValue({ summary: '章节摘要' });
    taskService.count.mockResolvedValue(1);

    await worker.processTask(task.id);

    expect(finalizationService.update).toHaveBeenCalledWith(
      { id: task.finalizationId },
      { summaryStatus: 'COMPLETED', summary: '章节摘要' },
    );
    expect(finalizationService.update).not.toHaveBeenCalledWith(
      { id: task.finalizationId },
      { status: 'FINALIZED', error: null },
    );
  });

  it('drains pending tasks beyond the first 20-task batch in one worker pass', async () => {
    const firstBatch = Array.from({ length: 20 }, (_, index) => ({
      ...task,
      id: `task-${index}`,
    }));
    const remainingTask = { ...task, id: 'task-20' };
    taskService.list
      .mockResolvedValueOnce({ list: firstBatch, total: 21, page: 1, limit: 20 })
      .mockResolvedValueOnce({ list: [remainingTask], total: 21, page: 2, limit: 20 });
    const processTask = jest.spyOn(worker, 'processTask').mockResolvedValue();

    await worker.processPendingTasks();

    expect(processTask).toHaveBeenCalledTimes(21);
    expect(taskService.list).toHaveBeenCalledTimes(2);
    expect(taskService.list).toHaveBeenNthCalledWith(
      1,
      { status: { in: ['PENDING', 'RECOVERABLE'] } },
      { page: 1, limit: 20, orderBy: { createdAt: 'asc' } },
    );
    expect(taskService.list).toHaveBeenNthCalledWith(
      2,
      { status: { in: ['PENDING', 'RECOVERABLE'] } },
      { page: 2, limit: 20, orderBy: { createdAt: 'asc' } },
    );
  });

  it('marks finalization complete only after the second task completes', async () => {
    taskService.updateMany.mockResolvedValue({ count: 1 });
    taskService.getById.mockResolvedValue({ ...task, type: 'INDEX' });
    revisionService.getById.mockResolvedValue({
      id: task.revisionId,
      projectId: task.projectId,
      content: '林雾握紧信件。',
    });
    runtimeClient.executeFinalizationTask.mockResolvedValue({ contentChecksum: 'checksum' });
    taskService.count.mockResolvedValue(2);

    await worker.processTask(task.id);

    expect(finalizationService.update).toHaveBeenCalledWith(
      { id: task.finalizationId },
      { indexStatus: 'COMPLETED' },
    );
    expect(finalizationService.update).toHaveBeenCalledWith(
      { id: task.finalizationId },
      { status: 'FINALIZED', error: null },
    );
  });

  it('marks the finalization recoverable while a failed task can still retry', async () => {
    taskService.updateMany.mockResolvedValue({ count: 1 });
    taskService.getById.mockResolvedValue(task);
    revisionService.getById.mockResolvedValue({
      id: task.revisionId,
      projectId: task.projectId,
      content: '林雾握紧信件。',
    });
    runtimeClient.executeFinalizationTask.mockRejectedValue(new Error('temporary runtime failure'));

    await worker.processTask(task.id);

    expect(finalizationService.update).toHaveBeenCalledWith(
      { id: task.finalizationId },
      expect.objectContaining({ status: 'RECOVERABLE', summaryStatus: 'FAILED' }),
    );
  });
});
