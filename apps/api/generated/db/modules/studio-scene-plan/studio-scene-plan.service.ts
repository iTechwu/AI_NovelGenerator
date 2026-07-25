import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioScenePlan } from '@prisma/client';

@Injectable()
export class StudioScenePlanService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioScenePlanWhereInput,
    additional?: { select?: Prisma.StudioScenePlanSelect; include?: Prisma.StudioScenePlanInclude },
  ): Promise<StudioScenePlan | null> {
    return this.getReadClient().studioScenePlan.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioScenePlanSelect; include?: Prisma.StudioScenePlanInclude },
  ): Promise<StudioScenePlan | null> {
    return this.getReadClient().studioScenePlan.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioScenePlanWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioScenePlanOrderByWithRelationInput|Prisma.StudioScenePlanOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioScenePlanSelect; include?: Prisma.StudioScenePlanInclude },
  ): Promise<{ list: StudioScenePlan[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioScenePlan.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioScenePlan.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioScenePlanWhereInput): Promise<number> {
    return this.getReadClient().studioScenePlan.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioScenePlanCreateInput,
    additional?: { select?: Prisma.StudioScenePlanSelect; include?: Prisma.StudioScenePlanInclude },
  ): Promise<StudioScenePlan> {
    return this.getWriteClient().studioScenePlan.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioScenePlanWhereUniqueInput,
    data: Prisma.StudioScenePlanUpdateInput,
    additional?: { select?: Prisma.StudioScenePlanSelect; include?: Prisma.StudioScenePlanInclude },
  ): Promise<StudioScenePlan> {
    return this.getWriteClient().studioScenePlan.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioScenePlanWhereUniqueInput): Promise<StudioScenePlan> {
    return this.getWriteClient().studioScenePlan.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioScenePlanCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioScenePlan.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioScenePlanWhereInput,
    data: Prisma.StudioScenePlanUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioScenePlan.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioScenePlanUpsertArgs,
  ): Promise<StudioScenePlan> {
    return this.getWriteClient().studioScenePlan.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioScenePlanWhereUniqueInput,
    additional?: { select?: Prisma.StudioScenePlanSelect; include?: Prisma.StudioScenePlanInclude },
  ): Promise<StudioScenePlan> {
    const record = await this.getReadClient().studioScenePlan.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioScenePlan not found');
    }
    return record;
  }
}
