import { Module } from '@nestjs/common';
import { StudioStandaloneScreenplayRevisionService } from './studio-standalone-screenplay-revision.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioStandaloneScreenplayRevisionService],
  exports: [StudioStandaloneScreenplayRevisionService],
})
export class StudioStandaloneScreenplayRevisionModule {}
