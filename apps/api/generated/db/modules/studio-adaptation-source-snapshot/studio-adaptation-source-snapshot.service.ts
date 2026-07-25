import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioAdaptationSourceSnapshot } from '@prisma/client';

@Injectable()
export class StudioAdaptationSourceSnapshotService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioAdaptationSourceSnapshotWhereInput,
    additional?: { select?: Prisma.StudioAdaptationSourceSnapshotSelect; include?: Prisma.StudioAdaptationSourceSnapshotInclude },
  ): Promise<StudioAdaptationSourceSnapshot | null> {
    return this.getReadClient().studioAdaptationSourceSnapshot.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioAdaptationSourceSnapshotSelect; include?: Prisma.StudioAdaptationSourceSnapshotInclude },
  ): Promise<StudioAdaptationSourceSnapshot | null> {
    return this.getReadClient().studioAdaptationSourceSnapshot.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByAdaptationId(value: string, additional?: { select?: Prisma.StudioAdaptationSourceSnapshotSelect; include?: Prisma.StudioAdaptationSourceSnapshotInclude }): Promise<StudioAdaptationSourceSnapshot | null> {
    return this.getReadClient().studioAdaptationSourceSnapshot.findUnique({
      where: { adaptationId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioAdaptationSourceSnapshotWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioAdaptationSourceSnapshotOrderByWithRelationInput|Prisma.StudioAdaptationSourceSnapshotOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioAdaptationSourceSnapshotSelect; include?: Prisma.StudioAdaptationSourceSnapshotInclude },
  ): Promise<{ list: StudioAdaptationSourceSnapshot[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioAdaptationSourceSnapshot.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioAdaptationSourceSnapshot.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioAdaptationSourceSnapshotWhereInput): Promise<number> {
    return this.getReadClient().studioAdaptationSourceSnapshot.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioAdaptationSourceSnapshotCreateInput,
    additional?: { select?: Prisma.StudioAdaptationSourceSnapshotSelect; include?: Prisma.StudioAdaptationSourceSnapshotInclude },
  ): Promise<StudioAdaptationSourceSnapshot> {
    return this.getWriteClient().studioAdaptationSourceSnapshot.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioAdaptationSourceSnapshotWhereUniqueInput,
    data: Prisma.StudioAdaptationSourceSnapshotUpdateInput,
    additional?: { select?: Prisma.StudioAdaptationSourceSnapshotSelect; include?: Prisma.StudioAdaptationSourceSnapshotInclude },
  ): Promise<StudioAdaptationSourceSnapshot> {
    return this.getWriteClient().studioAdaptationSourceSnapshot.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioAdaptationSourceSnapshotWhereUniqueInput): Promise<StudioAdaptationSourceSnapshot> {
    return this.getWriteClient().studioAdaptationSourceSnapshot.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioAdaptationSourceSnapshotCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationSourceSnapshot.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioAdaptationSourceSnapshotWhereInput,
    data: Prisma.StudioAdaptationSourceSnapshotUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioAdaptationSourceSnapshot.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioAdaptationSourceSnapshotUpsertArgs,
  ): Promise<StudioAdaptationSourceSnapshot> {
    return this.getWriteClient().studioAdaptationSourceSnapshot.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioAdaptationSourceSnapshotWhereUniqueInput,
    additional?: { select?: Prisma.StudioAdaptationSourceSnapshotSelect; include?: Prisma.StudioAdaptationSourceSnapshotInclude },
  ): Promise<StudioAdaptationSourceSnapshot> {
    const record = await this.getReadClient().studioAdaptationSourceSnapshot.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioAdaptationSourceSnapshot not found');
    }
    return record;
  }
}
