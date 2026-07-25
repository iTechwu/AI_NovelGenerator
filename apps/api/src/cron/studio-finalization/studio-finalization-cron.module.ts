import { Module } from '@nestjs/common';
import { StudioModule } from '../../modules/studio/studio.module';
import { StudioFinalizationTaskCron } from './studio-finalization-task.cron';

@Module({
  imports: [StudioModule],
  providers: [StudioFinalizationTaskCron],
})
export class StudioFinalizationCronModule {}
