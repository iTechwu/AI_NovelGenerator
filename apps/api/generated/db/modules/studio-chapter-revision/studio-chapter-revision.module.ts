import { Module } from '@nestjs/common';
import { StudioChapterRevisionService } from './studio-chapter-revision.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioChapterRevisionService],
  exports: [StudioChapterRevisionService],
})
export class StudioChapterRevisionModule {}
