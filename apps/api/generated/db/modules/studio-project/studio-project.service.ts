import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioProject } from '@prisma/client';

@Injectable()
export class StudioProjectService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioProjectWhereInput,
    additional?: { select?: Prisma.StudioProjectSelect; include?: Prisma.StudioProjectInclude },
  ): Promise<StudioProject | null> {
    return this.getReadClient().studioProject.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioProjectSelect; include?: Prisma.StudioProjectInclude },
  ): Promise<StudioProject | null> {
    return this.getReadClient().studioProject.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioProjectWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioProjectOrderByWithRelationInput|Prisma.StudioProjectOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioProjectSelect; include?: Prisma.StudioProjectInclude },
  ): Promise<{ list: StudioProject[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioProject.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioProject.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioProjectWhereInput): Promise<number> {
    return this.getReadClient().studioProject.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioProjectCreateInput,
    additional?: { select?: Prisma.StudioProjectSelect; include?: Prisma.StudioProjectInclude },
  ): Promise<StudioProject> {
    return this.getWriteClient().studioProject.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioProjectWhereUniqueInput,
    data: Prisma.StudioProjectUpdateInput,
    additional?: { select?: Prisma.StudioProjectSelect; include?: Prisma.StudioProjectInclude },
  ): Promise<StudioProject> {
    return this.getWriteClient().studioProject.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioProjectWhereUniqueInput): Promise<StudioProject> {
    return this.getWriteClient().studioProject.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioProjectCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioProject.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioProjectWhereInput,
    data: Prisma.StudioProjectUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioProject.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioProjectUpsertArgs,
  ): Promise<StudioProject> {
    return this.getWriteClient().studioProject.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioProjectWhereUniqueInput,
    additional?: { select?: Prisma.StudioProjectSelect; include?: Prisma.StudioProjectInclude },
  ): Promise<StudioProject> {
    const record = await this.getReadClient().studioProject.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioProject not found');
    }
    return record;
  }
}
