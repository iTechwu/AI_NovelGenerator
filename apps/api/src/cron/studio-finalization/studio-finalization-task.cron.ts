import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StudioFinalizationTaskWorker } from '../../modules/studio/studio-finalization-task.worker';

@Injectable()
export class StudioFinalizationTaskCron {
  constructor(private readonly worker: StudioFinalizationTaskWorker) {}

  @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
  async processPendingTasks(): Promise<void> {
    await this.worker.processPendingTasks();
  }
}
