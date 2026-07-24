import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioChapterFinalPointer } from '@prisma/client';

@Injectable()
export class StudioChapterFinalPointerService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioChapterFinalPointerWhereInput,
    additional?: { select?: Prisma.StudioChapterFinalPointerSelect; include?: Prisma.StudioChapterFinalPointerInclude },
  ): Promise<StudioChapterFinalPointer | null> {
    return this.getReadClient().studioChapterFinalPointer.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioChapterFinalPointerSelect; include?: Prisma.StudioChapterFinalPointerInclude },
  ): Promise<StudioChapterFinalPointer | null> {
    return this.getReadClient().studioChapterFinalPointer.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByRevisionId(value: string, additional?: { select?: Prisma.StudioChapterFinalPointerSelect; include?: Prisma.StudioChapterFinalPointerInclude }): Promise<StudioChapterFinalPointer | null> {
    return this.getReadClient().studioChapterFinalPointer.findUnique({
      where: { revisionId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioChapterFinalPointerWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioChapterFinalPointerOrderByWithRelationInput|Prisma.StudioChapterFinalPointerOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioChapterFinalPointerSelect; include?: Prisma.StudioChapterFinalPointerInclude },
  ): Promise<{ list: StudioChapterFinalPointer[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioChapterFinalPointer.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioChapterFinalPointer.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioChapterFinalPointerWhereInput): Promise<number> {
    return this.getReadClient().studioChapterFinalPointer.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioChapterFinalPointerCreateInput,
    additional?: { select?: Prisma.StudioChapterFinalPointerSelect; include?: Prisma.StudioChapterFinalPointerInclude },
  ): Promise<StudioChapterFinalPointer> {
    return this.getWriteClient().studioChapterFinalPointer.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioChapterFinalPointerWhereUniqueInput,
    data: Prisma.StudioChapterFinalPointerUpdateInput,
    additional?: { select?: Prisma.StudioChapterFinalPointerSelect; include?: Prisma.StudioChapterFinalPointerInclude },
  ): Promise<StudioChapterFinalPointer> {
    return this.getWriteClient().studioChapterFinalPointer.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioChapterFinalPointerWhereUniqueInput): Promise<StudioChapterFinalPointer> {
    return this.getWriteClient().studioChapterFinalPointer.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioChapterFinalPointerCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioChapterFinalPointer.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioChapterFinalPointerWhereInput,
    data: Prisma.StudioChapterFinalPointerUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioChapterFinalPointer.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioChapterFinalPointerUpsertArgs,
  ): Promise<StudioChapterFinalPointer> {
    return this.getWriteClient().studioChapterFinalPointer.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioChapterFinalPointerWhereUniqueInput,
    additional?: { select?: Prisma.StudioChapterFinalPointerSelect; include?: Prisma.StudioChapterFinalPointerInclude },
  ): Promise<StudioChapterFinalPointer> {
    const record = await this.getReadClient().studioChapterFinalPointer.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioChapterFinalPointer not found');
    }
    return record;
  }
}
