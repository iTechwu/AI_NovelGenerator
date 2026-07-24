import { Module } from '@nestjs/common';
import { StudioChapterFinalPointerService } from './studio-chapter-final-pointer.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioChapterFinalPointerService],
  exports: [StudioChapterFinalPointerService],
})
export class StudioChapterFinalPointerModule {}
