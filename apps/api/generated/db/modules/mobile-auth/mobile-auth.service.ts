import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, MobileAuth } from '@prisma/client';

@Injectable()
export class MobileAuthService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.MobileAuthWhereInput,
    additional?: { select?: Prisma.MobileAuthSelect; include?: Prisma.MobileAuthInclude },
  ): Promise<MobileAuth | null> {
    return this.getReadClient().mobileAuth.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.MobileAuthSelect; include?: Prisma.MobileAuthInclude },
  ): Promise<MobileAuth | null> {
    return this.getReadClient().mobileAuth.findUnique({
      where: { mobile: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByUserId(value: string, additional?: { select?: Prisma.MobileAuthSelect; include?: Prisma.MobileAuthInclude }): Promise<MobileAuth | null> {
    return this.getReadClient().mobileAuth.findUnique({
      where: { userId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.MobileAuthWhereInput,
    pagination?: {
      orderBy?: Prisma.MobileAuthOrderByWithRelationInput|Prisma.MobileAuthOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.MobileAuthSelect; include?: Prisma.MobileAuthInclude },
  ): Promise<{ list: MobileAuth[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().mobileAuth.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().mobileAuth.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.MobileAuthWhereInput): Promise<number> {
    return this.getReadClient().mobileAuth.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.MobileAuthCreateInput,
    additional?: { select?: Prisma.MobileAuthSelect; include?: Prisma.MobileAuthInclude },
  ): Promise<MobileAuth> {
    return this.getWriteClient().mobileAuth.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.MobileAuthWhereUniqueInput,
    data: Prisma.MobileAuthUpdateInput,
    additional?: { select?: Prisma.MobileAuthSelect; include?: Prisma.MobileAuthInclude },
  ): Promise<MobileAuth> {
    return this.getWriteClient().mobileAuth.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.MobileAuthWhereUniqueInput): Promise<MobileAuth> {
    return this.getWriteClient().mobileAuth.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.MobileAuthCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().mobileAuth.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.MobileAuthWhereInput,
    data: Prisma.MobileAuthUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().mobileAuth.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.MobileAuthUpsertArgs,
  ): Promise<MobileAuth> {
    return this.getWriteClient().mobileAuth.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.MobileAuthWhereUniqueInput,
    additional?: { select?: Prisma.MobileAuthSelect; include?: Prisma.MobileAuthInclude },
  ): Promise<MobileAuth> {
    const record = await this.getReadClient().mobileAuth.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('MobileAuth not found');
    }
    return record;
  }
}
