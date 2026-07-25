import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StudioService } from '../../modules/studio/studio.service';

@Injectable()
export class StudioGenerationSyncCron {
  constructor(private readonly studioService: StudioService) {}

  @Cron(CronExpression.EVERY_10_SECONDS, { waitForCompletion: true })
  async syncActiveRuns(): Promise<void> {
    await this.studioService.syncActiveGenerationRuns();
  }
}
