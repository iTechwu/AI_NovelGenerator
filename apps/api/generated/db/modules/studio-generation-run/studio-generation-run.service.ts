import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioGenerationRun } from '@prisma/client';

@Injectable()
export class StudioGenerationRunService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioGenerationRunWhereInput,
    additional?: { select?: Prisma.StudioGenerationRunSelect; include?: Prisma.StudioGenerationRunInclude },
  ): Promise<StudioGenerationRun | null> {
    return this.getReadClient().studioGenerationRun.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioGenerationRunSelect; include?: Prisma.StudioGenerationRunInclude },
  ): Promise<StudioGenerationRun | null> {
    return this.getReadClient().studioGenerationRun.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioGenerationRunWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioGenerationRunOrderByWithRelationInput|Prisma.StudioGenerationRunOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioGenerationRunSelect; include?: Prisma.StudioGenerationRunInclude },
  ): Promise<{ list: StudioGenerationRun[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioGenerationRun.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioGenerationRun.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioGenerationRunWhereInput): Promise<number> {
    return this.getReadClient().studioGenerationRun.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioGenerationRunCreateInput,
    additional?: { select?: Prisma.StudioGenerationRunSelect; include?: Prisma.StudioGenerationRunInclude },
  ): Promise<StudioGenerationRun> {
    return this.getWriteClient().studioGenerationRun.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioGenerationRunWhereUniqueInput,
    data: Prisma.StudioGenerationRunUpdateInput,
    additional?: { select?: Prisma.StudioGenerationRunSelect; include?: Prisma.StudioGenerationRunInclude },
  ): Promise<StudioGenerationRun> {
    return this.getWriteClient().studioGenerationRun.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioGenerationRunWhereUniqueInput): Promise<StudioGenerationRun> {
    return this.getWriteClient().studioGenerationRun.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioGenerationRunCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioGenerationRun.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioGenerationRunWhereInput,
    data: Prisma.StudioGenerationRunUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioGenerationRun.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioGenerationRunUpsertArgs,
  ): Promise<StudioGenerationRun> {
    return this.getWriteClient().studioGenerationRun.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioGenerationRunWhereUniqueInput,
    additional?: { select?: Prisma.StudioGenerationRunSelect; include?: Prisma.StudioGenerationRunInclude },
  ): Promise<StudioGenerationRun> {
    const record = await this.getReadClient().studioGenerationRun.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioGenerationRun not found');
    }
    return record;
  }
}
