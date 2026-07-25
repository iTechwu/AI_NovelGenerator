import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioAdaptationProject } from '@prisma/client';

@Injectable()
export class StudioAdaptationProjectService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioAdaptationProjectWhereInput,
    additional?: { select?: Prisma.StudioAdaptationProjectSelect; include?: Prisma.StudioAdaptationProjectInclude },
  ): Promise<StudioAdaptationProject | null> {
    return this.getReadClient().studioAdaptationProject.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioAdaptationProjectSelect; include?: Prisma.StudioAdaptationProjectInclude },
  ): Promise<StudioAdaptationProject | null> {
    return this.getReadClient().studioAdaptationProject.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioAdaptationProjectWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioAdaptationProjectOrderByWithRelationInput|Prisma.StudioAdaptationProjectOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioAdaptationProjectSelect; include?: Prisma.StudioAdaptationProjectInclude },
  ): Promise<{ list: StudioAdaptationProject[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioAdaptationProject.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioAdaptationProject.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioAdaptationProjectWhereInput): Promise<number> {
    return this.getReadClient().studioAdaptationProject.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioAdaptationProjectCreateInput,
    additional?: { select?: Prisma.StudioAdaptationProjectSelect; include?: Prisma.StudioAdaptationProjectInclude },
  ): Promise<StudioAdaptationProject> {
    return this.getWriteClient().studioAdaptationProject.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioAdaptationProjectWhereUniqueInput,
    data: Prisma.StudioAdaptationProjectUpdateInput,
    additional?: { select?: Prisma.StudioAdaptationProjectSelect; include?: Prisma.StudioAdaptationProjectInclude },
  ): Promise<StudioAdaptationProject> {
    return this.getWriteClient().studioAdaptationProject.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioAdaptationProjectWhereUniqueInput): Promise<StudioAdaptationProject> {
    return this.getWriteClient().studioAdaptationProject.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioAdaptationProjectCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationProject.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioAdaptationProjectWhereInput,
    data: Prisma.StudioAdaptationProjectUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationProject.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioAdaptationProjectUpsertArgs,
  ): Promise<StudioAdaptationProject> {
    return this.getWriteClient().studioAdaptationProject.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioAdaptationProjectWhereUniqueInput,
    additional?: { select?: Prisma.StudioAdaptationProjectSelect; include?: Prisma.StudioAdaptationProjectInclude },
  ): Promise<StudioAdaptationProject> {
    const record = await this.getReadClient().studioAdaptationProject.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioAdaptationProject not found');
    }
    return record;
  }
}
