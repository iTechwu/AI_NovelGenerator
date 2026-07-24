import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioChapterDraftPointer } from '@prisma/client';

@Injectable()
export class StudioChapterDraftPointerService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioChapterDraftPointerWhereInput,
    additional?: { select?: Prisma.StudioChapterDraftPointerSelect; include?: Prisma.StudioChapterDraftPointerInclude },
  ): Promise<StudioChapterDraftPointer | null> {
    return this.getReadClient().studioChapterDraftPointer.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioChapterDraftPointerSelect; include?: Prisma.StudioChapterDraftPointerInclude },
  ): Promise<StudioChapterDraftPointer | null> {
    return this.getReadClient().studioChapterDraftPointer.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByRevisionId(value: string, additional?: { select?: Prisma.StudioChapterDraftPointerSelect; include?: Prisma.StudioChapterDraftPointerInclude }): Promise<StudioChapterDraftPointer | null> {
    return this.getReadClient().studioChapterDraftPointer.findUnique({
      where: { revisionId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioChapterDraftPointerWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioChapterDraftPointerOrderByWithRelationInput|Prisma.StudioChapterDraftPointerOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioChapterDraftPointerSelect; include?: Prisma.StudioChapterDraftPointerInclude },
  ): Promise<{ list: StudioChapterDraftPointer[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioChapterDraftPointer.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioChapterDraftPointer.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioChapterDraftPointerWhereInput): Promise<number> {
    return this.getReadClient().studioChapterDraftPointer.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioChapterDraftPointerCreateInput,
    additional?: { select?: Prisma.StudioChapterDraftPointerSelect; include?: Prisma.StudioChapterDraftPointerInclude },
  ): Promise<StudioChapterDraftPointer> {
    return this.getWriteClient().studioChapterDraftPointer.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioChapterDraftPointerWhereUniqueInput,
    data: Prisma.StudioChapterDraftPointerUpdateInput,
    additional?: { select?: Prisma.StudioChapterDraftPointerSelect; include?: Prisma.StudioChapterDraftPointerInclude },
  ): Promise<StudioChapterDraftPointer> {
    return this.getWriteClient().studioChapterDraftPointer.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioChapterDraftPointerWhereUniqueInput): Promise<StudioChapterDraftPointer> {
    return this.getWriteClient().studioChapterDraftPointer.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioChapterDraftPointerCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioChapterDraftPointer.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioChapterDraftPointerWhereInput,
    data: Prisma.StudioChapterDraftPointerUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioChapterDraftPointer.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioChapterDraftPointerUpsertArgs,
  ): Promise<StudioChapterDraftPointer> {
    return this.getWriteClient().studioChapterDraftPointer.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioChapterDraftPointerWhereUniqueInput,
    additional?: { select?: Prisma.StudioChapterDraftPointerSelect; include?: Prisma.StudioChapterDraftPointerInclude },
  ): Promise<StudioChapterDraftPointer> {
    const record = await this.getReadClient().studioChapterDraftPointer.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioChapterDraftPointer not found');
    }
    return record;
  }
}
