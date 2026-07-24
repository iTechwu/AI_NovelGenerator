import { Module } from "@nestjs/common";
import { PrismaModule } from "@dofe/infra-prisma";
import { UnitOfWorkService } from "@dofe/infra-shared-db";
import {
  StudioBlueprintModule,
  StudioChapterPlanModule,
  StudioChapterDraftPointerModule,
  StudioChapterFinalPointerModule,
  StudioChapterFinalizationModule,
  StudioFinalizationOutboxTaskModule,
  StudioChapterRevisionModule,
  StudioFactModule,
  StudioReviewFindingModule,
  StudioFactChangeModule,
  StudioGenerationRunModule,
  StudioProjectModule,
} from "@app/db";
import { NovelRuntimeClientModule } from "../../clients/novel-runtime/novel-runtime-client.module";
import { StudioController } from "./studio.controller";
import { StudioFinalizationTaskWorker } from './studio-finalization-task.worker';
import { StudioService } from "./studio.service";

@Module({
  imports: [
    NovelRuntimeClientModule,
    PrismaModule,
    StudioProjectModule,
    StudioGenerationRunModule,
    StudioBlueprintModule,
    StudioChapterPlanModule,
    StudioChapterDraftPointerModule,
    StudioChapterFinalPointerModule,
    StudioChapterFinalizationModule,
    StudioFinalizationOutboxTaskModule,
    StudioChapterRevisionModule,
    StudioFactModule,
    StudioReviewFindingModule,
    StudioFactChangeModule,
  ],
  controllers: [StudioController],
  providers: [StudioService, StudioFinalizationTaskWorker, UnitOfWorkService],
})
export class StudioModule {}
