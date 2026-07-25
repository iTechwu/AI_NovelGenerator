import { Module } from '@nestjs/common';
import { StudioAdaptationDecisionService } from './studio-adaptation-decision.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioAdaptationDecisionService],
  exports: [StudioAdaptationDecisionService],
})
export class StudioAdaptationDecisionModule {}
