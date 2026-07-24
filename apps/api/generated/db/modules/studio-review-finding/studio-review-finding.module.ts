import { Module } from '@nestjs/common';
import { StudioReviewFindingService } from './studio-review-finding.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioReviewFindingService],
  exports: [StudioReviewFindingService],
})
export class StudioReviewFindingModule {}
