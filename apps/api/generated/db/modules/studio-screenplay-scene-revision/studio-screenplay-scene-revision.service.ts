import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioScreenplaySceneRevision } from '@prisma/client';

@Injectable()
export class StudioScreenplaySceneRevisionService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioScreenplaySceneRevisionWhereInput,
    additional?: { select?: Prisma.StudioScreenplaySceneRevisionSelect; include?: Prisma.StudioScreenplaySceneRevisionInclude },
  ): Promise<StudioScreenplaySceneRevision | null> {
    return this.getReadClient().studioScreenplaySceneRevision.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioScreenplaySceneRevisionSelect; include?: Prisma.StudioScreenplaySceneRevisionInclude },
  ): Promise<StudioScreenplaySceneRevision | null> {
    return this.getReadClient().studioScreenplaySceneRevision.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioScreenplaySceneRevisionWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioScreenplaySceneRevisionOrderByWithRelationInput|Prisma.StudioScreenplaySceneRevisionOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioScreenplaySceneRevisionSelect; include?: Prisma.StudioScreenplaySceneRevisionInclude },
  ): Promise<{ list: StudioScreenplaySceneRevision[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioScreenplaySceneRevision.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioScreenplaySceneRevision.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioScreenplaySceneRevisionWhereInput): Promise<number> {
    return this.getReadClient().studioScreenplaySceneRevision.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioScreenplaySceneRevisionCreateInput,
    additional?: { select?: Prisma.StudioScreenplaySceneRevisionSelect; include?: Prisma.StudioScreenplaySceneRevisionInclude },
  ): Promise<StudioScreenplaySceneRevision> {
    return this.getWriteClient().studioScreenplaySceneRevision.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioScreenplaySceneRevisionWhereUniqueInput,
    data: Prisma.StudioScreenplaySceneRevisionUpdateInput,
    additional?: { select?: Prisma.StudioScreenplaySceneRevisionSelect; include?: Prisma.StudioScreenplaySceneRevisionInclude },
  ): Promise<StudioScreenplaySceneRevision> {
    return this.getWriteClient().studioScreenplaySceneRevision.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioScreenplaySceneRevisionWhereUniqueInput): Promise<StudioScreenplaySceneRevision> {
    return this.getWriteClient().studioScreenplaySceneRevision.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioScreenplaySceneRevisionCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioScreenplaySceneRevision.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioScreenplaySceneRevisionWhereInput,
    data: Prisma.StudioScreenplaySceneRevisionUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioScreenplaySceneRevision.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioScreenplaySceneRevisionUpsertArgs,
  ): Promise<StudioScreenplaySceneRevision> {
    return this.getWriteClient().studioScreenplaySceneRevision.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioScreenplaySceneRevisionWhereUniqueInput,
    additional?: { select?: Prisma.StudioScreenplaySceneRevisionSelect; include?: Prisma.StudioScreenplaySceneRevisionInclude },
  ): Promise<StudioScreenplaySceneRevision> {
    const record = await this.getReadClient().studioScreenplaySceneRevision.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioScreenplaySceneRevision not found');
    }
    return record;
  }
}
