import { Module } from '@nestjs/common';
import { StudioAdaptationSourceChapterService } from './studio-adaptation-source-chapter.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioAdaptationSourceChapterService],
  exports: [StudioAdaptationSourceChapterService],
})
export class StudioAdaptationSourceChapterModule {}
