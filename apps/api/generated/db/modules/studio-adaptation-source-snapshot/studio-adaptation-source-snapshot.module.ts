import { Module } from '@nestjs/common';
import { StudioAdaptationSourceSnapshotService } from './studio-adaptation-source-snapshot.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioAdaptationSourceSnapshotService],
  exports: [StudioAdaptationSourceSnapshotService],
})
export class StudioAdaptationSourceSnapshotModule {}
