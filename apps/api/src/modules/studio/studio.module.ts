import { Module } from "@nestjs/common";
import { PrismaModule } from "@dofe/infra-prisma";
import { UnitOfWorkService } from "@dofe/infra-shared-db";
import {
  StudioBlueprintModule,
  StudioChapterPlanModule,
  StudioChapterDraftPointerModule,
  StudioChapterRevisionModule,
  StudioFactModule,
  StudioFactChangeModule,
  StudioGenerationRunModule,
  StudioProjectModule,
} from "@app/db";
import { NovelRuntimeClientModule } from "../../clients/novel-runtime/novel-runtime-client.module";
import { StudioController } from "./studio.controller";
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
    StudioChapterRevisionModule,
    StudioFactModule,
    StudioFactChangeModule,
  ],
  controllers: [StudioController],
  providers: [StudioService, UnitOfWorkService],
})
export class StudioModule {}
