import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioSourceSceneMapping } from '@prisma/client';

@Injectable()
export class StudioSourceSceneMappingService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioSourceSceneMappingWhereInput,
    additional?: { select?: Prisma.StudioSourceSceneMappingSelect; include?: Prisma.StudioSourceSceneMappingInclude },
  ): Promise<StudioSourceSceneMapping | null> {
    return this.getReadClient().studioSourceSceneMapping.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioSourceSceneMappingSelect; include?: Prisma.StudioSourceSceneMappingInclude },
  ): Promise<StudioSourceSceneMapping | null> {
    return this.getReadClient().studioSourceSceneMapping.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioSourceSceneMappingWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioSourceSceneMappingOrderByWithRelationInput|Prisma.StudioSourceSceneMappingOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioSourceSceneMappingSelect; include?: Prisma.StudioSourceSceneMappingInclude },
  ): Promise<{ list: StudioSourceSceneMapping[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioSourceSceneMapping.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioSourceSceneMapping.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioSourceSceneMappingWhereInput): Promise<number> {
    return this.getReadClient().studioSourceSceneMapping.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioSourceSceneMappingCreateInput,
    additional?: { select?: Prisma.StudioSourceSceneMappingSelect; include?: Prisma.StudioSourceSceneMappingInclude },
  ): Promise<StudioSourceSceneMapping> {
    return this.getWriteClient().studioSourceSceneMapping.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioSourceSceneMappingWhereUniqueInput,
    data: Prisma.StudioSourceSceneMappingUpdateInput,
    additional?: { select?: Prisma.StudioSourceSceneMappingSelect; include?: Prisma.StudioSourceSceneMappingInclude },
  ): Promise<StudioSourceSceneMapping> {
    return this.getWriteClient().studioSourceSceneMapping.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioSourceSceneMappingWhereUniqueInput): Promise<StudioSourceSceneMapping> {
    return this.getWriteClient().studioSourceSceneMapping.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioSourceSceneMappingCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioSourceSceneMapping.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioSourceSceneMappingWhereInput,
    data: Prisma.StudioSourceSceneMappingUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioSourceSceneMapping.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioSourceSceneMappingUpsertArgs,
  ): Promise<StudioSourceSceneMapping> {
    return this.getWriteClient().studioSourceSceneMapping.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioSourceSceneMappingWhereUniqueInput,
    additional?: { select?: Prisma.StudioSourceSceneMappingSelect; include?: Prisma.StudioSourceSceneMappingInclude },
  ): Promise<StudioSourceSceneMapping> {
    const record = await this.getReadClient().studioSourceSceneMapping.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioSourceSceneMapping not found');
    }
    return record;
  }
}
