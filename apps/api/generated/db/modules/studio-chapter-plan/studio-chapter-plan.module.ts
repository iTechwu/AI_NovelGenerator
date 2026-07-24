import { Module } from '@nestjs/common';
import { StudioChapterPlanService } from './studio-chapter-plan.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioChapterPlanService],
  exports: [StudioChapterPlanService],
})
export class StudioChapterPlanModule {}
