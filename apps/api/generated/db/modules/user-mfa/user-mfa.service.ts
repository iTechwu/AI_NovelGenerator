import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, UserMfa } from '@prisma/client';

@Injectable()
export class UserMfaService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.UserMfaWhereInput,
    additional?: { select?: Prisma.UserMfaSelect; include?: Prisma.UserMfaInclude },
  ): Promise<UserMfa | null> {
    return this.getReadClient().userMfa.findFirst({
      where: where,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.UserMfaSelect; include?: Prisma.UserMfaInclude },
  ): Promise<UserMfa | null> {
    return this.getReadClient().userMfa.findUnique({
      where: { id: id },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getByUserId(value: string, additional?: { select?: Prisma.UserMfaSelect; include?: Prisma.UserMfaInclude }): Promise<UserMfa | null> {
    return this.getReadClient().userMfa.findUnique({
      where: { userId: value },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.UserMfaWhereInput,
    pagination?: {
      orderBy?: Prisma.UserMfaOrderByWithRelationInput|Prisma.UserMfaOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.UserMfaSelect; include?: Prisma.UserMfaInclude },
  ): Promise<{ list: UserMfa[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().userMfa.findMany({
        where: where,
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().userMfa.count({
        where: where,
      }),
    ]);

    return { list, total, page, limit };
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.UserMfaWhereInput): Promise<number> {
    return this.getReadClient().userMfa.count({
      where: where ?? {},
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.UserMfaCreateInput,
    additional?: { select?: Prisma.UserMfaSelect; include?: Prisma.UserMfaInclude },
  ): Promise<UserMfa> {
    return this.getWriteClient().userMfa.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.UserMfaWhereUniqueInput,
    data: Prisma.UserMfaUpdateInput,
    additional?: { select?: Prisma.UserMfaSelect; include?: Prisma.UserMfaInclude },
  ): Promise<UserMfa> {
    return this.getWriteClient().userMfa.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.UserMfaWhereUniqueInput): Promise<UserMfa> {
    return this.getWriteClient().userMfa.delete({ where });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.UserMfaCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().userMfa.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.UserMfaWhereInput,
    data: Prisma.UserMfaUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().userMfa.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.UserMfaUpsertArgs,
  ): Promise<UserMfa> {
    return this.getWriteClient().userMfa.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.UserMfaWhereUniqueInput,
    additional?: { select?: Prisma.UserMfaSelect; include?: Prisma.UserMfaInclude },
  ): Promise<UserMfa> {
    const record = await this.getReadClient().userMfa.findUnique({
      where: { ...where },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('UserMfa not found');
    }
    return record;
  }
}
