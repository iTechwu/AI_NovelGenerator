import { Module } from '@nestjs/common';
import { StudioScenePlanService } from './studio-scene-plan.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioScenePlanService],
  exports: [StudioScenePlanService],
})
export class StudioScenePlanModule {}
