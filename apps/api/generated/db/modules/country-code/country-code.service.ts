import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dofe/infra-prisma';
import { TransactionalServiceBase } from '@dofe/infra-shared-db';
import { HandlePrismaError, DbOperationType } from '@dofe/infra-common';
import { PAGINATION } from '@repo/constants';
import type { Prisma, CountryCode } from '@prisma/client';

@Injectable()
export class CountryCodeService extends TransactionalServiceBase {

  constructor(
    prisma: PrismaService,
  ) {
    super(prisma);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async get(
    where: Prisma.CountryCodeWhereInput,
    additional?: { select?: Prisma.CountryCodeSelect },
  ): Promise<CountryCode | null> {
    return this.getReadClient().countryCode.findFirst({
      where: { ...where, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getById(
    id: string,
    additional?: { select?: Prisma.CountryCodeSelect },
  ): Promise<CountryCode | null> {
    return this.getReadClient().countryCode.findUnique({
      where: { id: id, isDeleted: false },
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async list(
    where: Prisma.CountryCodeWhereInput,
    pagination?: {
      orderBy?: Prisma.CountryCodeOrderByWithRelationInput|Prisma.CountryCodeOrderByWithRelationInput[];
      limit?: number;
      page?: number;
    },
    additional?: { select?: Prisma.CountryCodeSelect },
  ): Promise<{ list: CountryCode[]; total: number; page: number; limit: number }> {
    const {
      orderBy = { createdAt: 'desc' },
      limit = PAGINATION.MAX_PAGE_SIZE,
      page = 1,
    } = pagination || {};
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.getReadClient().countryCode.findMany({
        where: { ...where, isDeleted: false },
        orderBy,
        take: limit,
        skip,
        ...additional,
      }),
      this.getReadClient().countryCode.count({
        where: { ...where, isDeleted: false },
      }),
    ]);

    return { list, total, page, limit };
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async loadRelations(): Promise<Record<string, string[]>> {
    const countries = await this.getReadClient().countryCode.findMany({
      where: { isDeleted: false },
      select: {
        continent: true,
        code: true,
      },
    });

    return countries.reduce<Record<string, string[]>>((relations, country) => {
      relations[country.continent] ??= [];
      relations[country.continent].push(country.code);
      return relations;
    }, {});
  }


  @HandlePrismaError(DbOperationType.QUERY)
  async count(where?: Prisma.CountryCodeWhereInput): Promise<number> {
    return this.getReadClient().countryCode.count({
      where: where ? { ...where, isDeleted: false } : { isDeleted: false },
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async create(
    data: Prisma.CountryCodeCreateInput,
    additional?: { select?: Prisma.CountryCodeSelect },
  ): Promise<CountryCode> {
    return this.getWriteClient().countryCode.create({ data, ...additional });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async update(
    where: Prisma.CountryCodeWhereUniqueInput,
    data: Prisma.CountryCodeUpdateInput,
    additional?: { select?: Prisma.CountryCodeSelect },
  ): Promise<CountryCode> {
    return this.getWriteClient().countryCode.update({
      where,
      data,
      ...additional,
    });
  }

  @HandlePrismaError(DbOperationType.DELETE)
  async delete(where: Prisma.CountryCodeWhereUniqueInput): Promise<CountryCode> {
    return this.getWriteClient().countryCode.delete({ where });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async softDelete(where: Prisma.CountryCodeWhereUniqueInput): Promise<CountryCode> {
    return this.getWriteClient().countryCode.update({
      where,
      data: { isDeleted: true },
    });
  }

  @HandlePrismaError(DbOperationType.CREATE)
  async createMany(
    data: Prisma.CountryCodeCreateManyInput[],
  ): Promise<{ count: number }> {
    return this.getWriteClient().countryCode.createMany({ data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async updateMany(
    where: Prisma.CountryCodeWhereInput,
    data: Prisma.CountryCodeUpdateInput,
  ): Promise<{ count: number }> {
    return this.getWriteClient().countryCode.updateMany({ where, data });
  }

  @HandlePrismaError(DbOperationType.UPDATE)
  async upsert(
    args: Prisma.CountryCodeUpsertArgs,
  ): Promise<CountryCode> {
    return this.getWriteClient().countryCode.upsert(args);
  }

  @HandlePrismaError(DbOperationType.QUERY)
  async getOrThrow(
    where: Prisma.CountryCodeWhereUniqueInput,
    additional?: { select?: Prisma.CountryCodeSelect },
  ): Promise<CountryCode> {
    const record = await this.getReadClient().countryCode.findUnique({
      where: { ...where, isDeleted: false },
      ...additional,
    });
    if (!record) {
      throw new NotFoundException('CountryCode not found');
    }
    return record;
  }
}
