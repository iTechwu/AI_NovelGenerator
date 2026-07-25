import { Module } from '@nestjs/common';
import { StudioProjectImportService } from './studio-project-import.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioProjectImportService],
  exports: [StudioProjectImportService],
})
export class StudioProjectImportModule {}
