import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import {
  StudioChapterFinalizationService,
  StudioChapterRevisionService,
  StudioFinalizationOutboxTaskService,
  StudioProjectEventService,
} from '@app/db';
import type { StudioFinalizationOutboxTask } from '@prisma/client';
import { NovelRuntimeClient } from '../../clients/novel-runtime/novel-runtime.client';

const MAX_AUTOMATIC_ATTEMPTS = 3;

@Injectable()
export class StudioFinalizationTaskWorker {
  constructor(
    private readonly taskService: StudioFinalizationOutboxTaskService,
    private readonly finalizationService: StudioChapterFinalizationService,
    private readonly revisionService: StudioChapterRevisionService,
    private readonly projectEventService: StudioProjectEventService,
    private readonly runtimeClient: NovelRuntimeClient,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async processPendingTasks(): Promise<void> {
    const batchSize = 20;
    const tasks: StudioFinalizationOutboxTask[] = [];
    for (let page = 1; ; page += 1) {
      const result = await this.taskService.list(
        { status: { in: ['PENDING', 'RECOVERABLE'] } },
        { page, limit: batchSize, orderBy: { createdAt: 'asc' } },
      );
      tasks.push(...result.list);
      if (result.list.length < batchSize || tasks.length >= result.total) break;
    }

    for (const task of tasks) await this.processTask(task.id);
  }

  async processTask(taskId: string): Promise<void> {
    const claimed = await this.taskService.updateMany(
      { id: taskId, status: { in: ['PENDING', 'RECOVERABLE'] } },
      { status: 'RUNNING', attemptCount: { increment: 1 }, lastError: null },
    );
    if (claimed.count === 0) return;

    const task = await this.taskService.getById(taskId);
    if (!task) return;
    try {
      const revision = await this.revisionService.getById(task.revisionId);
      if (!revision || revision.projectId !== task.projectId) {
        throw new Error('The finalization revision is unavailable');
      }
      const result = await this.runtimeClient.executeFinalizationTask({
        taskId: task.id,
        projectId: task.projectId,
        revisionId: task.revisionId,
        chapterNumber: task.chapterNumber,
        type: task.type.toLowerCase() as 'summary' | 'index',
        content: revision.content,
      });
      await this.completeTask(task, result);
    } catch (error) {
      await this.failTask(task, error);
    }
  }

  private async completeTask(
    task: StudioFinalizationOutboxTask,
    result: Awaited<ReturnType<NovelRuntimeClient['executeFinalizationTask']>>,
  ): Promise<void> {
    await this.taskService.update(
      { id: task.id },
      {
        status: 'COMPLETED',
        result: JSON.parse(JSON.stringify(result)),
        completedAt: new Date(),
        lastError: null,
      },
    );
    await this.projectEventService.create({
      project: { connect: { id: task.projectId } },
      type: 'FINALIZATION_TASK_STATUS',
      payload: {
        taskId: task.id,
        status: 'completed',
        type: task.type.toLowerCase(),
        attemptCount: task.attemptCount + 1,
        elapsedMs: Date.now() - task.createdAt.getTime(),
      },
    });
    await this.finalizationService.update(
      { id: task.finalizationId },
      task.type === 'SUMMARY'
        ? { summaryStatus: 'COMPLETED', summary: result.summary ?? null }
        : { indexStatus: 'COMPLETED' },
    );
    const completedTaskCount = await this.taskService.count({
      finalizationId: task.finalizationId,
      status: 'COMPLETED',
    });
    if (completedTaskCount >= 2) {
      await this.finalizationService.update(
        { id: task.finalizationId },
        { status: 'FINALIZED', error: null },
      );
    }
  }

  private async failTask(task: StudioFinalizationOutboxTask, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const recoverable = task.attemptCount < MAX_AUTOMATIC_ATTEMPTS;
    await this.taskService.update(
      { id: task.id },
      {
        status: recoverable ? 'RECOVERABLE' : 'FAILED',
        lastError: message.slice(0, 4_000),
      },
    );
    await this.projectEventService.create({
      project: { connect: { id: task.projectId } },
      type: 'FINALIZATION_TASK_STATUS',
      payload: {
        taskId: task.id,
        status: recoverable ? 'recoverable' : 'failed',
        type: task.type.toLowerCase(),
        attemptCount: task.attemptCount,
        elapsedMs: Date.now() - task.createdAt.getTime(),
        failureReason: message.slice(0, 4_000),
      },
    });
    await this.finalizationService.update(
      { id: task.finalizationId },
      task.type === 'SUMMARY'
        ? {
            status: recoverable ? 'RECOVERABLE' : 'FAILED',
            summaryStatus: 'FAILED',
            error: message.slice(0, 4_000),
          }
        : {
            status: recoverable ? 'RECOVERABLE' : 'FAILED',
            indexStatus: 'FAILED',
            error: message.slice(0, 4_000),
          },
    );
    this.logger.error('Studio finalization outbox task failed', {
      taskId: task.id,
      projectId: task.projectId,
      type: task.type,
      attemptCount: task.attemptCount,
      error: message,
    });
  }
}
