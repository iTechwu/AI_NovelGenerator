import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioStandaloneScreenplayScene } from '@prisma/client';

@Injectable()
export class StudioStandaloneScreenplaySceneService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioStandaloneScreenplaySceneWhereInput,
    additional?: { select?: Prisma.StudioStandaloneScreenplaySceneSelect; include?: Prisma.StudioStandaloneScreenplaySceneInclude },
  ): Promise<StudioStandaloneScreenplayScene | null> {
    return this.getReadClient().studioStandaloneScreenplayScene.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioStandaloneScreenplaySceneSelect; include?: Prisma.StudioStandaloneScreenplaySceneInclude },
  ): Promise<StudioStandaloneScreenplayScene | null> {
    return this.getReadClient().studioStandaloneScreenplayScene.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioStandaloneScreenplaySceneWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioStandaloneScreenplaySceneOrderByWithRelationInput|Prisma.StudioStandaloneScreenplaySceneOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioStandaloneScreenplaySceneSelect; include?: Prisma.StudioStandaloneScreenplaySceneInclude },
  ): Promise<{ list: StudioStandaloneScreenplayScene[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioStandaloneScreenplayScene.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioStandaloneScreenplayScene.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioStandaloneScreenplaySceneWhereInput): Promise<number> {
    return this.getReadClient().studioStandaloneScreenplayScene.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioStandaloneScreenplaySceneCreateInput,
    additional?: { select?: Prisma.StudioStandaloneScreenplaySceneSelect; include?: Prisma.StudioStandaloneScreenplaySceneInclude },
  ): Promise<StudioStandaloneScreenplayScene> {
    return this.getWriteClient().studioStandaloneScreenplayScene.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioStandaloneScreenplaySceneWhereUniqueInput,
    data: Prisma.StudioStandaloneScreenplaySceneUpdateInput,
    additional?: { select?: Prisma.StudioStandaloneScreenplaySceneSelect; include?: Prisma.StudioStandaloneScreenplaySceneInclude },
  ): Promise<StudioStandaloneScreenplayScene> {
    return this.getWriteClient().studioStandaloneScreenplayScene.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioStandaloneScreenplaySceneWhereUniqueInput): Promise<StudioStandaloneScreenplayScene> {
    return this.getWriteClient().studioStandaloneScreenplayScene.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioStandaloneScreenplaySceneCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioStandaloneScreenplayScene.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioStandaloneScreenplaySceneWhereInput,
    data: Prisma.StudioStandaloneScreenplaySceneUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioStandaloneScreenplayScene.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioStandaloneScreenplaySceneUpsertArgs,
  ): Promise<StudioStandaloneScreenplayScene> {
    return this.getWriteClient().studioStandaloneScreenplayScene.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioStandaloneScreenplaySceneWhereUniqueInput,
    additional?: { select?: Prisma.StudioStandaloneScreenplaySceneSelect; include?: Prisma.StudioStandaloneScreenplaySceneInclude },
  ): Promise<StudioStandaloneScreenplayScene> {
    const record = await this.getReadClient().studioStandaloneScreenplayScene.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioStandaloneScreenplayScene not found');
    }
    return record;
  }
}
