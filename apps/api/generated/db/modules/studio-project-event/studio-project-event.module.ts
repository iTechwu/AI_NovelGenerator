import { Module } from '@nestjs/common';
import { StudioProjectEventService } from './studio-project-event.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioProjectEventService],
  exports: [StudioProjectEventService],
})
export class StudioProjectEventModule {}
