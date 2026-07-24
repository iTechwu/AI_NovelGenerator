import { Module } from '@nestjs/common';
import { StudioBlueprintService } from './studio-blueprint.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioBlueprintService],
  exports: [StudioBlueprintService],
})
export class StudioBlueprintModule {}
