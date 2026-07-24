import { Module } from '@nestjs/common';
import { StudioChapterFinalizationService } from './studio-chapter-finalization.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioChapterFinalizationService],
  exports: [StudioChapterFinalizationService],
})
export class StudioChapterFinalizationModule {}
