import { Module } from '@nestjs/common';
import { PrismaModule } from '@dofe/infra-prisma';
import { UnitOfWorkService } from '@dofe/infra-shared-db';
import {
  StudioBlueprintModule,
  StudioChapterPlanModule,
  StudioChapterDraftPointerModule,
  StudioChapterFinalPointerModule,
  StudioChapterFinalizationModule,
  StudioFinalizationFactSnapshotModule,
  StudioFinalizationOutboxTaskModule,
  StudioChapterRevisionModule,
  StudioFactModule,
  StudioReviewFindingModule,
  StudioFactChangeModule,
  StudioGenerationRunModule,
  StudioProjectModule,
  StudioProjectImportModule,
  StudioProjectEventModule,
  StudioAdaptationProjectModule,
  StudioAdaptationSourceSnapshotModule,
  StudioAdaptationSourceChapterModule,
} from '@app/db';
import { NovelRuntimeClientModule } from '../../clients/novel-runtime/novel-runtime-client.module';
import { AuditLogModule } from '@app/audit-log';
import { StudioController } from './studio.controller';
import { StudioFinalizationTaskWorker } from './studio-finalization-task.worker';
import { StudioService } from './studio.service';

@Module({
  imports: [
    NovelRuntimeClientModule,
    AuditLogModule,
    PrismaModule,
    StudioProjectModule,
    StudioProjectImportModule,
    StudioProjectEventModule,
    StudioAdaptationProjectModule,
    StudioAdaptationSourceSnapshotModule,
    StudioAdaptationSourceChapterModule,
    StudioGenerationRunModule,
    StudioBlueprintModule,
    StudioChapterPlanModule,
    StudioChapterDraftPointerModule,
    StudioChapterFinalPointerModule,
    StudioChapterFinalizationModule,
    StudioFinalizationFactSnapshotModule,
    StudioFinalizationOutboxTaskModule,
    StudioChapterRevisionModule,
    StudioFactModule,
    StudioReviewFindingModule,
    StudioFactChangeModule,
  ],
  controllers: [StudioController],
  providers: [StudioService, StudioFinalizationTaskWorker, UnitOfWorkService],
  exports: [StudioService, StudioFinalizationTaskWorker],
})
export class StudioModule {}
