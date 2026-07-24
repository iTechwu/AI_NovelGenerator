import { Module } from '@nestjs/common';
import { StudioFactChangeService } from './studio-fact-change.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioFactChangeService],
  exports: [StudioFactChangeService],
})
export class StudioFactChangeModule {}
