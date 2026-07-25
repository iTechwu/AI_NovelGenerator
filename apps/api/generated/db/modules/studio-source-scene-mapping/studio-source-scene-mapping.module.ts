import { Module } from '@nestjs/common';
import { StudioSourceSceneMappingService } from './studio-source-scene-mapping.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioSourceSceneMappingService],
  exports: [StudioSourceSceneMappingService],
})
export class StudioSourceSceneMappingModule {}
