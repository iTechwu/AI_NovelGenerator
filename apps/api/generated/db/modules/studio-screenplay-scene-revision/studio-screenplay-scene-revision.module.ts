import { Module } from '@nestjs/common';
import { StudioScreenplaySceneRevisionService } from './studio-screenplay-scene-revision.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioScreenplaySceneRevisionService],
  exports: [StudioScreenplaySceneRevisionService],
})
export class StudioScreenplaySceneRevisionModule {}
