import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioProjectEvent } from '@prisma/client';

@Injectable()
export class StudioProjectEventService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioProjectEventWhereInput,
    additional?: { select?: Prisma.StudioProjectEventSelect; include?: Prisma.StudioProjectEventInclude },
  ): Promise<StudioProjectEvent | null> {
    return this.getReadClient().studioProjectEvent.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioProjectEventSelect; include?: Prisma.StudioProjectEventInclude },
  ): Promise<StudioProjectEvent | null> {
    return this.getReadClient().studioProjectEvent.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioProjectEventWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioProjectEventOrderByWithRelationInput|Prisma.StudioProjectEventOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioProjectEventSelect; include?: Prisma.StudioProjectEventInclude },
  ): Promise<{ list: StudioProjectEvent[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioProjectEvent.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioProjectEvent.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioProjectEventWhereInput): Promise<number> {
    return this.getReadClient().studioProjectEvent.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioProjectEventCreateInput,
    additional?: { select?: Prisma.StudioProjectEventSelect; include?: Prisma.StudioProjectEventInclude },
  ): Promise<StudioProjectEvent> {
    return this.getWriteClient().studioProjectEvent.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioProjectEventWhereUniqueInput,
    data: Prisma.StudioProjectEventUpdateInput,
    additional?: { select?: Prisma.StudioProjectEventSelect; include?: Prisma.StudioProjectEventInclude },
  ): Promise<StudioProjectEvent> {
    return this.getWriteClient().studioProjectEvent.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioProjectEventWhereUniqueInput): Promise<StudioProjectEvent> {
    return this.getWriteClient().studioProjectEvent.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioProjectEventCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioProjectEvent.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioProjectEventWhereInput,
    data: Prisma.StudioProjectEventUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioProjectEvent.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioProjectEventUpsertArgs,
  ): Promise<StudioProjectEvent> {
    return this.getWriteClient().studioProjectEvent.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioProjectEventWhereUniqueInput,
    additional?: { select?: Prisma.StudioProjectEventSelect; include?: Prisma.StudioProjectEventInclude },
  ): Promise<StudioProjectEvent> {
    const record = await this.getReadClient().studioProjectEvent.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioProjectEvent not found');
    }
    return record;
  }
}
