import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioBlueprint } from '@prisma/client';

@Injectable()
export class StudioBlueprintService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioBlueprintWhereInput,
    additional?: { select?: Prisma.StudioBlueprintSelect; include?: Prisma.StudioBlueprintInclude },
  ): Promise<StudioBlueprint | null> {
    return this.getReadClient().studioBlueprint.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioBlueprintSelect; include?: Prisma.StudioBlueprintInclude },
  ): Promise<StudioBlueprint | null> {
    return this.getReadClient().studioBlueprint.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByRunId(value: string, additional?: { select?: Prisma.StudioBlueprintSelect; include?: Prisma.StudioBlueprintInclude }): Promise<StudioBlueprint | null> {
    return this.getReadClient().studioBlueprint.findUnique({
      where: { runId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioBlueprintWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioBlueprintOrderByWithRelationInput|Prisma.StudioBlueprintOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioBlueprintSelect; include?: Prisma.StudioBlueprintInclude },
  ): Promise<{ list: StudioBlueprint[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioBlueprint.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioBlueprint.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioBlueprintWhereInput): Promise<number> {
    return this.getReadClient().studioBlueprint.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioBlueprintCreateInput,
    additional?: { select?: Prisma.StudioBlueprintSelect; include?: Prisma.StudioBlueprintInclude },
  ): Promise<StudioBlueprint> {
    return this.getWriteClient().studioBlueprint.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioBlueprintWhereUniqueInput,
    data: Prisma.StudioBlueprintUpdateInput,
    additional?: { select?: Prisma.StudioBlueprintSelect; include?: Prisma.StudioBlueprintInclude },
  ): Promise<StudioBlueprint> {
    return this.getWriteClient().studioBlueprint.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioBlueprintWhereUniqueInput): Promise<StudioBlueprint> {
    return this.getWriteClient().studioBlueprint.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioBlueprintCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioBlueprint.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioBlueprintWhereInput,
    data: Prisma.StudioBlueprintUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioBlueprint.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioBlueprintUpsertArgs,
  ): Promise<StudioBlueprint> {
    return this.getWriteClient().studioBlueprint.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioBlueprintWhereUniqueInput,
    additional?: { select?: Prisma.StudioBlueprintSelect; include?: Prisma.StudioBlueprintInclude },
  ): Promise<StudioBlueprint> {
    const record = await this.getReadClient().studioBlueprint.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioBlueprint not found');
    }
    return record;
  }
}
