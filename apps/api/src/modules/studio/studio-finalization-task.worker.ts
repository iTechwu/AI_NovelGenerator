import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import {
  StudioChapterFinalizationService,
  StudioChapterRevisionService,
  StudioFinalizationOutboxTaskService,
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
    private readonly runtimeClient: NovelRuntimeClient,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingTasks(): Promise<void> {
    const { list } = await this.taskService.list(
      { status: { in: ['PENDING', 'RECOVERABLE'] } },
      { page: 1, limit: 20, orderBy: { createdAt: 'asc' } },
    );
    for (const task of list) await this.processTask(task.id);
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
    await this.finalizationService.update(
      { id: task.finalizationId },
      task.type === 'SUMMARY'
        ? { summaryStatus: 'COMPLETED', summary: result.summary ?? null }
        : { indexStatus: 'COMPLETED' },
    );
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
    await this.finalizationService.update(
      { id: task.finalizationId },
      task.type === 'SUMMARY' ? { summaryStatus: 'FAILED' } : { indexStatus: 'FAILED' },
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
