import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioAdaptationSourceChapter } from '@prisma/client';

@Injectable()
export class StudioAdaptationSourceChapterService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioAdaptationSourceChapterWhereInput,
    additional?: { select?: Prisma.StudioAdaptationSourceChapterSelect; include?: Prisma.StudioAdaptationSourceChapterInclude },
  ): Promise<StudioAdaptationSourceChapter | null> {
    return this.getReadClient().studioAdaptationSourceChapter.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioAdaptationSourceChapterSelect; include?: Prisma.StudioAdaptationSourceChapterInclude },
  ): Promise<StudioAdaptationSourceChapter | null> {
    return this.getReadClient().studioAdaptationSourceChapter.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioAdaptationSourceChapterWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioAdaptationSourceChapterOrderByWithRelationInput|Prisma.StudioAdaptationSourceChapterOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioAdaptationSourceChapterSelect; include?: Prisma.StudioAdaptationSourceChapterInclude },
  ): Promise<{ list: StudioAdaptationSourceChapter[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioAdaptationSourceChapter.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioAdaptationSourceChapter.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioAdaptationSourceChapterWhereInput): Promise<number> {
    return this.getReadClient().studioAdaptationSourceChapter.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioAdaptationSourceChapterCreateInput,
    additional?: { select?: Prisma.StudioAdaptationSourceChapterSelect; include?: Prisma.StudioAdaptationSourceChapterInclude },
  ): Promise<StudioAdaptationSourceChapter> {
    return this.getWriteClient().studioAdaptationSourceChapter.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioAdaptationSourceChapterWhereUniqueInput,
    data: Prisma.StudioAdaptationSourceChapterUpdateInput,
    additional?: { select?: Prisma.StudioAdaptationSourceChapterSelect; include?: Prisma.StudioAdaptationSourceChapterInclude },
  ): Promise<StudioAdaptationSourceChapter> {
    return this.getWriteClient().studioAdaptationSourceChapter.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioAdaptationSourceChapterWhereUniqueInput): Promise<StudioAdaptationSourceChapter> {
    return this.getWriteClient().studioAdaptationSourceChapter.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioAdaptationSourceChapterCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationSourceChapter.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioAdaptationSourceChapterWhereInput,
    data: Prisma.StudioAdaptationSourceChapterUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationSourceChapter.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioAdaptationSourceChapterUpsertArgs,
  ): Promise<StudioAdaptationSourceChapter> {
    return this.getWriteClient().studioAdaptationSourceChapter.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioAdaptationSourceChapterWhereUniqueInput,
    additional?: { select?: Prisma.StudioAdaptationSourceChapterSelect; include?: Prisma.StudioAdaptationSourceChapterInclude },
  ): Promise<StudioAdaptationSourceChapter> {
    const record = await this.getReadClient().studioAdaptationSourceChapter.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioAdaptationSourceChapter not found');
    }
    return record;
  }
}
