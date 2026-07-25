import { Module } from '@nestjs/common';
import { StudioAdaptationReviewAnnotationService } from './studio-adaptation-review-annotation.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [StudioAdaptationReviewAnnotationService],
  exports: [StudioAdaptationReviewAnnotationService],
})
export class StudioAdaptationReviewAnnotationModule {}
