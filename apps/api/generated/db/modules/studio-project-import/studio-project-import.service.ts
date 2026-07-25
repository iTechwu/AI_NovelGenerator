import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioProjectImport } from '@prisma/client';

@Injectable()
export class StudioProjectImportService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioProjectImportWhereInput,
    additional?: { select?: Prisma.StudioProjectImportSelect; include?: Prisma.StudioProjectImportInclude },
  ): Promise<StudioProjectImport | null> {
    return this.getReadClient().studioProjectImport.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioProjectImportSelect; include?: Prisma.StudioProjectImportInclude },
  ): Promise<StudioProjectImport | null> {
    return this.getReadClient().studioProjectImport.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByProjectId(value: string, additional?: { select?: Prisma.StudioProjectImportSelect; include?: Prisma.StudioProjectImportInclude }): Promise<StudioProjectImport | null> {
    return this.getReadClient().studioProjectImport.findUnique({
      where: { projectId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioProjectImportWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioProjectImportOrderByWithRelationInput|Prisma.StudioProjectImportOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioProjectImportSelect; include?: Prisma.StudioProjectImportInclude },
  ): Promise<{ list: StudioProjectImport[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioProjectImport.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioProjectImport.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioProjectImportWhereInput): Promise<number> {
    return this.getReadClient().studioProjectImport.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioProjectImportCreateInput,
    additional?: { select?: Prisma.StudioProjectImportSelect; include?: Prisma.StudioProjectImportInclude },
  ): Promise<StudioProjectImport> {
    return this.getWriteClient().studioProjectImport.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioProjectImportWhereUniqueInput,
    data: Prisma.StudioProjectImportUpdateInput,
    additional?: { select?: Prisma.StudioProjectImportSelect; include?: Prisma.StudioProjectImportInclude },
  ): Promise<StudioProjectImport> {
    return this.getWriteClient().studioProjectImport.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioProjectImportWhereUniqueInput): Promise<StudioProjectImport> {
    return this.getWriteClient().studioProjectImport.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioProjectImportCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioProjectImport.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioProjectImportWhereInput,
    data: Prisma.StudioProjectImportUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioProjectImport.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioProjectImportUpsertArgs,
  ): Promise<StudioProjectImport> {
    return this.getWriteClient().studioProjectImport.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioProjectImportWhereUniqueInput,
    additional?: { select?: Prisma.StudioProjectImportSelect; include?: Prisma.StudioProjectImportInclude },
  ): Promise<StudioProjectImport> {
    const record = await this.getReadClient().studioProjectImport.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioProjectImport not found');
    }
    return record;
  }
}
