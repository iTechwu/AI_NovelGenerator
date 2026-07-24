import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioFact } from '@prisma/client';

@Injectable()
export class StudioFactService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioFactWhereInput,
    additional?: { select?: Prisma.StudioFactSelect; include?: Prisma.StudioFactInclude },
  ): Promise<StudioFact | null> {
    return this.getReadClient().studioFact.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioFactSelect; include?: Prisma.StudioFactInclude },
  ): Promise<StudioFact | null> {
    return this.getReadClient().studioFact.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getBySourceChangeId(value: string, additional?: { select?: Prisma.StudioFactSelect; include?: Prisma.StudioFactInclude }): Promise<StudioFact | null> {
    return this.getReadClient().studioFact.findUnique({
      where: { sourceChangeId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioFactWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioFactOrderByWithRelationInput|Prisma.StudioFactOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioFactSelect; include?: Prisma.StudioFactInclude },
  ): Promise<{ list: StudioFact[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioFact.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioFact.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioFactWhereInput): Promise<number> {
    return this.getReadClient().studioFact.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioFactCreateInput,
    additional?: { select?: Prisma.StudioFactSelect; include?: Prisma.StudioFactInclude },
  ): Promise<StudioFact> {
    return this.getWriteClient().studioFact.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioFactWhereUniqueInput,
    data: Prisma.StudioFactUpdateInput,
    additional?: { select?: Prisma.StudioFactSelect; include?: Prisma.StudioFactInclude },
  ): Promise<StudioFact> {
    return this.getWriteClient().studioFact.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioFactWhereUniqueInput): Promise<StudioFact> {
    return this.getWriteClient().studioFact.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioFactCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioFact.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioFactWhereInput,
    data: Prisma.StudioFactUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioFact.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioFactUpsertArgs,
  ): Promise<StudioFact> {
    return this.getWriteClient().studioFact.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioFactWhereUniqueInput,
    additional?: { select?: Prisma.StudioFactSelect; include?: Prisma.StudioFactInclude },
  ): Promise<StudioFact> {
    const record = await this.getReadClient().studioFact.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioFact not found');
    }
    return record;
  }
}
