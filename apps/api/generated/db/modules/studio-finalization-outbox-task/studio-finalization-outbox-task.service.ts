import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, StudioFinalizationOutboxTask } from '@prisma/client';

@Injectable()
export class StudioFinalizationOutboxTaskService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.StudioFinalizationOutboxTaskWhereInput,
    additional?: { select?: Prisma.StudioFinalizationOutboxTaskSelect; include?: Prisma.StudioFinalizationOutboxTaskInclude },
  ): Promise<StudioFinalizationOutboxTask | null> {
    return this.getReadClient().studioFinalizationOutboxTask.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.StudioFinalizationOutboxTaskSelect; include?: Prisma.StudioFinalizationOutboxTaskInclude },
  ): Promise<StudioFinalizationOutboxTask | null> {
    return this.getReadClient().studioFinalizationOutboxTask.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByIdempotencyKey(value: string, additional?: { select?: Prisma.StudioFinalizationOutboxTaskSelect; include?: Prisma.StudioFinalizationOutboxTaskInclude }): Promise<StudioFinalizationOutboxTask | null> {
    return this.getReadClient().studioFinalizationOutboxTask.findUnique({
      where: { idempotencyKey: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.StudioFinalizationOutboxTaskWhereInput,
    pagination?: {
      orderBy?: Prisma.StudioFinalizationOutboxTaskOrderByWithRelationInput|Prisma.StudioFinalizationOutboxTaskOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.StudioFinalizationOutboxTaskSelect; include?: Prisma.StudioFinalizationOutboxTaskInclude },
  ): Promise<{ list: StudioFinalizationOutboxTask[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().studioFinalizationOutboxTask.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().studioFinalizationOutboxTask.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.StudioFinalizationOutboxTaskWhereInput): Promise<number> {
    return this.getReadClient().studioFinalizationOutboxTask.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.StudioFinalizationOutboxTaskCreateInput,
    additional?: { select?: Prisma.StudioFinalizationOutboxTaskSelect; include?: Prisma.StudioFinalizationOutboxTaskInclude },
  ): Promise<StudioFinalizationOutboxTask> {
    return this.getWriteClient().studioFinalizationOutboxTask.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.StudioFinalizationOutboxTaskWhereUniqueInput,
    data: Prisma.StudioFinalizationOutboxTaskUpdateInput,
    additional?: { select?: Prisma.StudioFinalizationOutboxTaskSelect; include?: Prisma.StudioFinalizationOutboxTaskInclude },
  ): Promise<StudioFinalizationOutboxTask> {
    return this.getWriteClient().studioFinalizationOutboxTask.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.StudioFinalizationOutboxTaskWhereUniqueInput): Promise<StudioFinalizationOutboxTask> {
    return this.getWriteClient().studioFinalizationOutboxTask.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.StudioFinalizationOutboxTaskCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioFinalizationOutboxTask.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.StudioFinalizationOutboxTaskWhereInput,
    data: Prisma.StudioFinalizationOutboxTaskUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().studioFinalizationOutboxTask.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.StudioFinalizationOutboxTaskUpsertArgs,
  ): Promise<StudioFinalizationOutboxTask> {
    return this.getWriteClient().studioFinalizationOutboxTask.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.StudioFinalizationOutboxTaskWhereUniqueInput,
    additional?: { select?: Prisma.StudioFinalizationOutboxTaskSelect; include?: Prisma.StudioFinalizationOutboxTaskInclude },
  ): Promise<StudioFinalizationOutboxTask> {
    const record = await this.getReadClient().studioFinalizationOutboxTask.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('StudioFinalizationOutboxTask not found');
    }
    return record;
  }
}
