import { Module } from '@nestjs/common';
import { StudioChapterDraftPointerService } from './studio-chapter-draft-pointer.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioChapterDraftPointerService],
  exports: [StudioChapterDraftPointerService],
})
export class StudioChapterDraftPointerModule {}
