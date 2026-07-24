import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioChapterPlan } from '@prisma/client';

@Injectable()
export class StudioChapterPlanService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioChapterPlanWhereInput,
    additional?: { select?: Prisma.StudioChapterPlanSelect; include?: Prisma.StudioChapterPlanInclude },
  ): Promise<StudioChapterPlan | null> {
    return this.getReadClient().studioChapterPlan.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioChapterPlanSelect; include?: Prisma.StudioChapterPlanInclude },
  ): Promise<StudioChapterPlan | null> {
    return this.getReadClient().studioChapterPlan.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioChapterPlanWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioChapterPlanOrderByWithRelationInput|Prisma.StudioChapterPlanOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioChapterPlanSelect; include?: Prisma.StudioChapterPlanInclude },
  ): Promise<{ list: StudioChapterPlan[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioChapterPlan.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioChapterPlan.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioChapterPlanWhereInput): Promise<number> {
    return this.getReadClient().studioChapterPlan.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioChapterPlanCreateInput,
    additional?: { select?: Prisma.StudioChapterPlanSelect; include?: Prisma.StudioChapterPlanInclude },
  ): Promise<StudioChapterPlan> {
    return this.getWriteClient().studioChapterPlan.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioChapterPlanWhereUniqueInput,
    data: Prisma.StudioChapterPlanUpdateInput,
    additional?: { select?: Prisma.StudioChapterPlanSelect; include?: Prisma.StudioChapterPlanInclude },
  ): Promise<StudioChapterPlan> {
    return this.getWriteClient().studioChapterPlan.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioChapterPlanWhereUniqueInput): Promise<StudioChapterPlan> {
    return this.getWriteClient().studioChapterPlan.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioChapterPlanCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioChapterPlan.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioChapterPlanWhereInput,
    data: Prisma.StudioChapterPlanUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioChapterPlan.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioChapterPlanUpsertArgs,
  ): Promise<StudioChapterPlan> {
    return this.getWriteClient().studioChapterPlan.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioChapterPlanWhereUniqueInput,
    additional?: { select?: Prisma.StudioChapterPlanSelect; include?: Prisma.StudioChapterPlanInclude },
  ): Promise<StudioChapterPlan> {
    const record = await this.getReadClient().studioChapterPlan.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioChapterPlan not found');
    }
    return record;
  }
}
