import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioAdaptationReviewAnnotation } from '@prisma/client';

@Injectable()
export class StudioAdaptationReviewAnnotationService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioAdaptationReviewAnnotationWhereInput,
    additional?: { select?: Prisma.StudioAdaptationReviewAnnotationSelect; include?: Prisma.StudioAdaptationReviewAnnotationInclude },
  ): Promise<StudioAdaptationReviewAnnotation | null> {
    return this.getReadClient().studioAdaptationReviewAnnotation.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioAdaptationReviewAnnotationSelect; include?: Prisma.StudioAdaptationReviewAnnotationInclude },
  ): Promise<StudioAdaptationReviewAnnotation | null> {
    return this.getReadClient().studioAdaptationReviewAnnotation.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioAdaptationReviewAnnotationWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioAdaptationReviewAnnotationOrderByWithRelationInput|Prisma.StudioAdaptationReviewAnnotationOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioAdaptationReviewAnnotationSelect; include?: Prisma.StudioAdaptationReviewAnnotationInclude },
  ): Promise<{ list: StudioAdaptationReviewAnnotation[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioAdaptationReviewAnnotation.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioAdaptationReviewAnnotation.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioAdaptationReviewAnnotationWhereInput): Promise<number> {
    return this.getReadClient().studioAdaptationReviewAnnotation.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioAdaptationReviewAnnotationCreateInput,
    additional?: { select?: Prisma.StudioAdaptationReviewAnnotationSelect; include?: Prisma.StudioAdaptationReviewAnnotationInclude },
  ): Promise<StudioAdaptationReviewAnnotation> {
    return this.getWriteClient().studioAdaptationReviewAnnotation.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioAdaptationReviewAnnotationWhereUniqueInput,
    data: Prisma.StudioAdaptationReviewAnnotationUpdateInput,
    additional?: { select?: Prisma.StudioAdaptationReviewAnnotationSelect; include?: Prisma.StudioAdaptationReviewAnnotationInclude },
  ): Promise<StudioAdaptationReviewAnnotation> {
    return this.getWriteClient().studioAdaptationReviewAnnotation.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioAdaptationReviewAnnotationWhereUniqueInput): Promise<StudioAdaptationReviewAnnotation> {
    return this.getWriteClient().studioAdaptationReviewAnnotation.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioAdaptationReviewAnnotationCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationReviewAnnotation.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioAdaptationReviewAnnotationWhereInput,
    data: Prisma.StudioAdaptationReviewAnnotationUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationReviewAnnotation.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioAdaptationReviewAnnotationUpsertArgs,
  ): Promise<StudioAdaptationReviewAnnotation> {
    return this.getWriteClient().studioAdaptationReviewAnnotation.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioAdaptationReviewAnnotationWhereUniqueInput,
    additional?: { select?: Prisma.StudioAdaptationReviewAnnotationSelect; include?: Prisma.StudioAdaptationReviewAnnotationInclude },
  ): Promise<StudioAdaptationReviewAnnotation> {
    const record = await this.getReadClient().studioAdaptationReviewAnnotation.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioAdaptationReviewAnnotation not found');
    }
    return record;
  }
}
