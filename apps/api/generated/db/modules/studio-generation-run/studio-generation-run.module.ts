import { Module } from '@nestjs/common';
import { StudioGenerationRunService } from './studio-generation-run.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioGenerationRunService],
  exports: [StudioGenerationRunService],
})
export class StudioGenerationRunModule {}
