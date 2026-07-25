import { Module } from '@nestjs/common';
import { StudioModule } from '../../modules/studio/studio.module';
import { StudioGenerationSyncCron } from './studio-generation-sync.cron';

@Module({
  imports: [StudioModule],
  providers: [StudioGenerationSyncCron],
})
export class StudioGenerationCronModule {}
