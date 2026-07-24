import { Module } from '@nestjs/common';
import { StudioProjectService } from './studio-project.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioProjectService],
  exports: [StudioProjectService],
})
export class StudioProjectModule {}
