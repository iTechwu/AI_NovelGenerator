import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioAdaptationDecision } from '@prisma/client';

@Injectable()
export class StudioAdaptationDecisionService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioAdaptationDecisionWhereInput,
    additional?: { select?: Prisma.StudioAdaptationDecisionSelect; include?: Prisma.StudioAdaptationDecisionInclude },
  ): Promise<StudioAdaptationDecision | null> {
    return this.getReadClient().studioAdaptationDecision.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioAdaptationDecisionSelect; include?: Prisma.StudioAdaptationDecisionInclude },
  ): Promise<StudioAdaptationDecision | null> {
    return this.getReadClient().studioAdaptationDecision.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioAdaptationDecisionWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioAdaptationDecisionOrderByWithRelationInput|Prisma.StudioAdaptationDecisionOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioAdaptationDecisionSelect; include?: Prisma.StudioAdaptationDecisionInclude },
  ): Promise<{ list: StudioAdaptationDecision[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioAdaptationDecision.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioAdaptationDecision.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioAdaptationDecisionWhereInput): Promise<number> {
    return this.getReadClient().studioAdaptationDecision.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioAdaptationDecisionCreateInput,
    additional?: { select?: Prisma.StudioAdaptationDecisionSelect; include?: Prisma.StudioAdaptationDecisionInclude },
  ): Promise<StudioAdaptationDecision> {
    return this.getWriteClient().studioAdaptationDecision.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioAdaptationDecisionWhereUniqueInput,
    data: Prisma.StudioAdaptationDecisionUpdateInput,
    additional?: { select?: Prisma.StudioAdaptationDecisionSelect; include?: Prisma.StudioAdaptationDecisionInclude },
  ): Promise<StudioAdaptationDecision> {
    return this.getWriteClient().studioAdaptationDecision.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioAdaptationDecisionWhereUniqueInput): Promise<StudioAdaptationDecision> {
    return this.getWriteClient().studioAdaptationDecision.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioAdaptationDecisionCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationDecision.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioAdaptationDecisionWhereInput,
    data: Prisma.StudioAdaptationDecisionUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationDecision.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioAdaptationDecisionUpsertArgs,
  ): Promise<StudioAdaptationDecision> {
    return this.getWriteClient().studioAdaptationDecision.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioAdaptationDecisionWhereUniqueInput,
    additional?: { select?: Prisma.StudioAdaptationDecisionSelect; include?: Prisma.StudioAdaptationDecisionInclude },
  ): Promise<StudioAdaptationDecision> {
    const record = await this.getReadClient().studioAdaptationDecision.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioAdaptationDecision not found');
    }
    return record;
  }
}
