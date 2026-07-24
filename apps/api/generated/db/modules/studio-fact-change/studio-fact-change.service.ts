import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioFactChange } from '@prisma/client';

@Injectable()
export class StudioFactChangeService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioFactChangeWhereInput,
    additional?: { select?: Prisma.StudioFactChangeSelect; include?: Prisma.StudioFactChangeInclude },
  ): Promise<StudioFactChange | null> {
    return this.getReadClient().studioFactChange.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioFactChangeSelect; include?: Prisma.StudioFactChangeInclude },
  ): Promise<StudioFactChange | null> {
    return this.getReadClient().studioFactChange.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioFactChangeWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioFactChangeOrderByWithRelationInput|Prisma.StudioFactChangeOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioFactChangeSelect; include?: Prisma.StudioFactChangeInclude },
  ): Promise<{ list: StudioFactChange[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioFactChange.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioFactChange.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioFactChangeWhereInput): Promise<number> {
    return this.getReadClient().studioFactChange.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioFactChangeCreateInput,
    additional?: { select?: Prisma.StudioFactChangeSelect; include?: Prisma.StudioFactChangeInclude },
  ): Promise<StudioFactChange> {
    return this.getWriteClient().studioFactChange.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioFactChangeWhereUniqueInput,
    data: Prisma.StudioFactChangeUpdateInput,
    additional?: { select?: Prisma.StudioFactChangeSelect; include?: Prisma.StudioFactChangeInclude },
  ): Promise<StudioFactChange> {
    return this.getWriteClient().studioFactChange.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioFactChangeWhereUniqueInput): Promise<StudioFactChange> {
    return this.getWriteClient().studioFactChange.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioFactChangeCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioFactChange.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioFactChangeWhereInput,
    data: Prisma.StudioFactChangeUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioFactChange.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioFactChangeUpsertArgs,
  ): Promise<StudioFactChange> {
    return this.getWriteClient().studioFactChange.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioFactChangeWhereUniqueInput,
    additional?: { select?: Prisma.StudioFactChangeSelect; include?: Prisma.StudioFactChangeInclude },
  ): Promise<StudioFactChange> {
    const record = await this.getReadClient().studioFactChange.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioFactChange not found');
    }
    return record;
  }
}
