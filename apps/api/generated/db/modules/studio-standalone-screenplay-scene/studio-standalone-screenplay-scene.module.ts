import { Module } from '@nestjs/common';
import { StudioStandaloneScreenplaySceneService } from './studio-standalone-screenplay-scene.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioStandaloneScreenplaySceneService],
  exports: [StudioStandaloneScreenplaySceneService],
})
export class StudioStandaloneScreenplaySceneModule {}
