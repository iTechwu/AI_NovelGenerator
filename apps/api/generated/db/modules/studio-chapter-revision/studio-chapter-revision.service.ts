import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioChapterRevision } from '@prisma/client';

@Injectable()
export class StudioChapterRevisionService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioChapterRevisionWhereInput,
    additional?: { select?: Prisma.StudioChapterRevisionSelect; include?: Prisma.StudioChapterRevisionInclude },
  ): Promise<StudioChapterRevision | null> {
    return this.getReadClient().studioChapterRevision.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioChapterRevisionSelect; include?: Prisma.StudioChapterRevisionInclude },
  ): Promise<StudioChapterRevision | null> {
    return this.getReadClient().studioChapterRevision.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByRunId(value: string, additional?: { select?: Prisma.StudioChapterRevisionSelect; include?: Prisma.StudioChapterRevisionInclude }): Promise<StudioChapterRevision | null> {
    return this.getReadClient().studioChapterRevision.findUnique({
      where: { runId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioChapterRevisionWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioChapterRevisionOrderByWithRelationInput|Prisma.StudioChapterRevisionOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioChapterRevisionSelect; include?: Prisma.StudioChapterRevisionInclude },
  ): Promise<{ list: StudioChapterRevision[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioChapterRevision.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioChapterRevision.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioChapterRevisionWhereInput): Promise<number> {
    return this.getReadClient().studioChapterRevision.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioChapterRevisionCreateInput,
    additional?: { select?: Prisma.StudioChapterRevisionSelect; include?: Prisma.StudioChapterRevisionInclude },
  ): Promise<StudioChapterRevision> {
    return this.getWriteClient().studioChapterRevision.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioChapterRevisionWhereUniqueInput,
    data: Prisma.StudioChapterRevisionUpdateInput,
    additional?: { select?: Prisma.StudioChapterRevisionSelect; include?: Prisma.StudioChapterRevisionInclude },
  ): Promise<StudioChapterRevision> {
    return this.getWriteClient().studioChapterRevision.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioChapterRevisionWhereUniqueInput): Promise<StudioChapterRevision> {
    return this.getWriteClient().studioChapterRevision.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioChapterRevisionCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioChapterRevision.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioChapterRevisionWhereInput,
    data: Prisma.StudioChapterRevisionUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioChapterRevision.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioChapterRevisionUpsertArgs,
  ): Promise<StudioChapterRevision> {
    return this.getWriteClient().studioChapterRevision.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioChapterRevisionWhereUniqueInput,
    additional?: { select?: Prisma.StudioChapterRevisionSelect; include?: Prisma.StudioChapterRevisionInclude },
  ): Promise<StudioChapterRevision> {
    const record = await this.getReadClient().studioChapterRevision.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioChapterRevision not found');
    }
    return record;
  }
}
