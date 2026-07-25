import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioStandaloneScreenplayRevision } from '@prisma/client';

@Injectable()
export class StudioStandaloneScreenplayRevisionService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioStandaloneScreenplayRevisionWhereInput,
    additional?: { select?: Prisma.StudioStandaloneScreenplayRevisionSelect; include?: Prisma.StudioStandaloneScreenplayRevisionInclude },
  ): Promise<StudioStandaloneScreenplayRevision | null> {
    return this.getReadClient().studioStandaloneScreenplayRevision.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioStandaloneScreenplayRevisionSelect; include?: Prisma.StudioStandaloneScreenplayRevisionInclude },
  ): Promise<StudioStandaloneScreenplayRevision | null> {
    return this.getReadClient().studioStandaloneScreenplayRevision.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioStandaloneScreenplayRevisionWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioStandaloneScreenplayRevisionOrderByWithRelationInput|Prisma.StudioStandaloneScreenplayRevisionOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioStandaloneScreenplayRevisionSelect; include?: Prisma.StudioStandaloneScreenplayRevisionInclude },
  ): Promise<{ list: StudioStandaloneScreenplayRevision[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioStandaloneScreenplayRevision.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioStandaloneScreenplayRevision.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioStandaloneScreenplayRevisionWhereInput): Promise<number> {
    return this.getReadClient().studioStandaloneScreenplayRevision.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioStandaloneScreenplayRevisionCreateInput,
    additional?: { select?: Prisma.StudioStandaloneScreenplayRevisionSelect; include?: Prisma.StudioStandaloneScreenplayRevisionInclude },
  ): Promise<StudioStandaloneScreenplayRevision> {
    return this.getWriteClient().studioStandaloneScreenplayRevision.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioStandaloneScreenplayRevisionWhereUniqueInput,
    data: Prisma.StudioStandaloneScreenplayRevisionUpdateInput,
    additional?: { select?: Prisma.StudioStandaloneScreenplayRevisionSelect; include?: Prisma.StudioStandaloneScreenplayRevisionInclude },
  ): Promise<StudioStandaloneScreenplayRevision> {
    return this.getWriteClient().studioStandaloneScreenplayRevision.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioStandaloneScreenplayRevisionWhereUniqueInput): Promise<StudioStandaloneScreenplayRevision> {
    return this.getWriteClient().studioStandaloneScreenplayRevision.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioStandaloneScreenplayRevisionCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioStandaloneScreenplayRevision.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioStandaloneScreenplayRevisionWhereInput,
    data: Prisma.StudioStandaloneScreenplayRevisionUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioStandaloneScreenplayRevision.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioStandaloneScreenplayRevisionUpsertArgs,
  ): Promise<StudioStandaloneScreenplayRevision> {
    return this.getWriteClient().studioStandaloneScreenplayRevision.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioStandaloneScreenplayRevisionWhereUniqueInput,
    additional?: { select?: Prisma.StudioStandaloneScreenplayRevisionSelect; include?: Prisma.StudioStandaloneScreenplayRevisionInclude },
  ): Promise<StudioStandaloneScreenplayRevision> {
    const record = await this.getReadClient().studioStandaloneScreenplayRevision.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioStandaloneScreenplayRevision not found');
    }
    return record;
  }
}
