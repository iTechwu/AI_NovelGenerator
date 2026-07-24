import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioReviewFinding } from '@prisma/client';

@Injectable()
export class StudioReviewFindingService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioReviewFindingWhereInput,
    additional?: { select?: Prisma.StudioReviewFindingSelect; include?: Prisma.StudioReviewFindingInclude },
  ): Promise<StudioReviewFinding | null> {
    return this.getReadClient().studioReviewFinding.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioReviewFindingSelect; include?: Prisma.StudioReviewFindingInclude },
  ): Promise<StudioReviewFinding | null> {
    return this.getReadClient().studioReviewFinding.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByFindingKey(value: string, additional?: { select?: Prisma.StudioReviewFindingSelect; include?: Prisma.StudioReviewFindingInclude }): Promise<StudioReviewFinding | null> {
    return this.getReadClient().studioReviewFinding.findUnique({
      where: { findingKey: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioReviewFindingWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioReviewFindingOrderByWithRelationInput|Prisma.StudioReviewFindingOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioReviewFindingSelect; include?: Prisma.StudioReviewFindingInclude },
  ): Promise<{ list: StudioReviewFinding[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioReviewFinding.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioReviewFinding.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioReviewFindingWhereInput): Promise<number> {
    return this.getReadClient().studioReviewFinding.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioReviewFindingCreateInput,
    additional?: { select?: Prisma.StudioReviewFindingSelect; include?: Prisma.StudioReviewFindingInclude },
  ): Promise<StudioReviewFinding> {
    return this.getWriteClient().studioReviewFinding.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioReviewFindingWhereUniqueInput,
    data: Prisma.StudioReviewFindingUpdateInput,
    additional?: { select?: Prisma.StudioReviewFindingSelect; include?: Prisma.StudioReviewFindingInclude },
  ): Promise<StudioReviewFinding> {
    return this.getWriteClient().studioReviewFinding.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioReviewFindingWhereUniqueInput): Promise<StudioReviewFinding> {
    return this.getWriteClient().studioReviewFinding.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioReviewFindingCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioReviewFinding.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioReviewFindingWhereInput,
    data: Prisma.StudioReviewFindingUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioReviewFinding.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioReviewFindingUpsertArgs,
  ): Promise<StudioReviewFinding> {
    return this.getWriteClient().studioReviewFinding.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioReviewFindingWhereUniqueInput,
    additional?: { select?: Prisma.StudioReviewFindingSelect; include?: Prisma.StudioReviewFindingInclude },
  ): Promise<StudioReviewFinding> {
    const record = await this.getReadClient().studioReviewFinding.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioReviewFinding not found');
    }
    return record;
  }
}
