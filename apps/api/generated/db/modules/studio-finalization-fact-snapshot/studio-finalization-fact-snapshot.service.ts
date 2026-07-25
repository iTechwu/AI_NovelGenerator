import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioFinalizationFactSnapshot } from '@prisma/client';

@Injectable()
export class StudioFinalizationFactSnapshotService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioFinalizationFactSnapshotWhereInput,
    additional?: { select?: Prisma.StudioFinalizationFactSnapshotSelect; include?: Prisma.StudioFinalizationFactSnapshotInclude },
  ): Promise<StudioFinalizationFactSnapshot | null> {
    return this.getReadClient().studioFinalizationFactSnapshot.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioFinalizationFactSnapshotSelect; include?: Prisma.StudioFinalizationFactSnapshotInclude },
  ): Promise<StudioFinalizationFactSnapshot | null> {
    return this.getReadClient().studioFinalizationFactSnapshot.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioFinalizationFactSnapshotWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioFinalizationFactSnapshotOrderByWithRelationInput|Prisma.StudioFinalizationFactSnapshotOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioFinalizationFactSnapshotSelect; include?: Prisma.StudioFinalizationFactSnapshotInclude },
  ): Promise<{ list: StudioFinalizationFactSnapshot[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioFinalizationFactSnapshot.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioFinalizationFactSnapshot.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioFinalizationFactSnapshotWhereInput): Promise<number> {
    return this.getReadClient().studioFinalizationFactSnapshot.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioFinalizationFactSnapshotCreateInput,
    additional?: { select?: Prisma.StudioFinalizationFactSnapshotSelect; include?: Prisma.StudioFinalizationFactSnapshotInclude },
  ): Promise<StudioFinalizationFactSnapshot> {
    return this.getWriteClient().studioFinalizationFactSnapshot.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioFinalizationFactSnapshotWhereUniqueInput,
    data: Prisma.StudioFinalizationFactSnapshotUpdateInput,
    additional?: { select?: Prisma.StudioFinalizationFactSnapshotSelect; include?: Prisma.StudioFinalizationFactSnapshotInclude },
  ): Promise<StudioFinalizationFactSnapshot> {
    return this.getWriteClient().studioFinalizationFactSnapshot.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioFinalizationFactSnapshotWhereUniqueInput): Promise<StudioFinalizationFactSnapshot> {
    return this.getWriteClient().studioFinalizationFactSnapshot.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioFinalizationFactSnapshotCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioFinalizationFactSnapshot.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioFinalizationFactSnapshotWhereInput,
    data: Prisma.StudioFinalizationFactSnapshotUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioFinalizationFactSnapshot.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioFinalizationFactSnapshotUpsertArgs,
  ): Promise<StudioFinalizationFactSnapshot> {
    return this.getWriteClient().studioFinalizationFactSnapshot.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioFinalizationFactSnapshotWhereUniqueInput,
    additional?: { select?: Prisma.StudioFinalizationFactSnapshotSelect; include?: Prisma.StudioFinalizationFactSnapshotInclude },
  ): Promise<StudioFinalizationFactSnapshot> {
    const record = await this.getReadClient().studioFinalizationFactSnapshot.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioFinalizationFactSnapshot not found');
    }
    return record;
  }
}
