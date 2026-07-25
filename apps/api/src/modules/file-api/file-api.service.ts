import { Injectable } from '@nestjs/common';
import { FileDomainService, type CdnUrlOptions } from '@app/services/file';
import { FileSourceService } from '@app/db';
import type { Prisma } from '@prisma/client';

/** 文件 CRUD/CDN/stats 的薄包装层（业务编排在 FileDomainService）。 */
@Injectable()
export class FileApiService {
  constructor(
    private readonly fileDomain: FileDomainService,
    private readonly fileSourceDb: FileSourceService,
  ) {}

  list(query: Parameters<FileDomainService['list']>[0]) {
    return this.fileDomain.list(query);
  }

  getById(id: string) {
    return this.fileDomain.getById(id);
  }

  update(id: string, data: Parameters<FileDomainService['updateMetadata']>[1]) {
    return this.fileDomain.updateMetadata(id, data);
  }

  async delete(id: string) {
    await this.fileDomain.softDelete(id);
    return { success: true };
  }

  async getCdnUrl(id: string, options: CdnUrlOptions) {
    const url = (await this.fileDomain.resolveCdnUrl(id, options)) ?? '';
    return {
      url,
      template: options.template,
      width: options.width,
      height: options.height,
      format: options.format,
    };
  }

  batchGet(ids: string[]) {
    return this.fileDomain.batchGet(ids);
  }

  async stats(query: {
    scope?: string;
    access?: string;
    tenantId?: string;
    teamId?: string;
    uploadedBy?: string;
  }) {
    const where: Prisma.FileSourceWhereInput = { isUploaded: true };
    if (query.scope) where.scope = query.scope;
    if (query.access) where.access = query.access as 'public' | 'private';
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.uploadedBy) where.uploadedBy = query.uploadedBy;
    const totalFiles = await this.fileSourceDb.count(where);
    // totalSize 需聚合查询；MVP 暂返回 0，后续在 FileSourceService 扩展 aggregateStats
    return { totalFiles, totalSize: 0 };
  }
}
