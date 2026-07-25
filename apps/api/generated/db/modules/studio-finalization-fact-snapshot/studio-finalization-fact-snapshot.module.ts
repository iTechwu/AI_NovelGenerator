import { Module } from '@nestjs/common';
import { StudioFinalizationFactSnapshotService } from './studio-finalization-fact-snapshot.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioFinalizationFactSnapshotService],
  exports: [StudioFinalizationFactSnapshotService],
})
export class StudioFinalizationFactSnapshotModule {}
