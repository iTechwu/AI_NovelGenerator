import { Module } from '@nestjs/common';
import { StudioAdaptationProjectService } from './studio-adaptation-project.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioAdaptationProjectService],
  exports: [StudioAdaptationProjectService],
})
export class StudioAdaptationProjectModule {}
