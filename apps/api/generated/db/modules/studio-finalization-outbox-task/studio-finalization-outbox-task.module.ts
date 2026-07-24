import { Module } from '@nestjs/common';
import { StudioFinalizationOutboxTaskService } from './studio-finalization-outbox-task.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioFinalizationOutboxTaskService],
  exports: [StudioFinalizationOutboxTaskService],
})
export class StudioFinalizationOutboxTaskModule {}
