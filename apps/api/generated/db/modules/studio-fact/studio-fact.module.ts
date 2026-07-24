import { Module } from '@nestjs/common';
import { StudioFactService } from './studio-fact.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioFactService],
  exports: [StudioFactService],
})
export class StudioFactModule {}
