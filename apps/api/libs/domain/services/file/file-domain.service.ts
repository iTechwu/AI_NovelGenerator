import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FileCdnClient, FileStorageService } from '@dofe/infra-shared-services';
import { fileUtil } from '@dofe/infra-utils';
import { FileSourceService } from '@app/db';
import type { FileBucketVendor, FileSource, Prisma } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

// ─── Types ────────────────────────────────────────────────────────────

export type FileScope = 'avatar' | 'logo' | 'media_asset' | 'knowledge' | 'general' | 'system';

export interface FileRequestContext {
  userId?: string;
  tenantId?: string;
  isAdmin?: boolean;
}

export interface CdnUrlOptions {
  template?: 'origin' | 'preview' | 'thumb' | 'video_snapshot';
  width?: number;
  height?: number;
  format?: string;
  quality?: number;
}

// ─── Bucket routing（物理桶名，对齐 config.local.yaml 的 buckets[]）────

export const FILE_BUCKETS = {
  public: 'xica-ai-public',
  private: 'xica-ai-private',
  system: 'xica-ai-system',
} as const;

const BUCKET_ROUTING: Record<FileScope, { bucket: string; access: 'public' | 'private' }> = {
  avatar: { bucket: FILE_BUCKETS.public, access: 'public' },
  logo: { bucket: FILE_BUCKETS.public, access: 'public' },
  media_asset: { bucket: FILE_BUCKETS.public, access: 'public' },
  knowledge: { bucket: FILE_BUCKETS.private, access: 'private' },
  general: { bucket: FILE_BUCKETS.private, access: 'private' },
  system: { bucket: FILE_BUCKETS.system, access: 'private' },
};

const DEFAULT_VENDOR = 'tos' as FileBucketVendor;
const DEFAULT_REGION = 'cn-beijing';

export interface FileDto {
  id: string;
  key: string;
  bucket: string;
  vendor: FileBucketVendor;
  region: string;
  filename: string | null;
  fsize: number;
  mimeType: string;
  ext: string;
  sha256: string | null;
  hash: string | null;
  scope: FileScope;
  access: 'public' | 'private';
  tenantId: string | null;
  teamId: string | null;
  uploadedBy: string | null;
  metadata: Record<string, unknown> | null;
  isUploaded: boolean;
  status: number;
  cdnUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FileDomainService {
  constructor(
    private readonly fileSourceDb: FileSourceService,
    private readonly fileStorage: FileStorageService,
    private readonly fileCdn: FileCdnClient,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  // ─── Bucket routing ─────────────────────────────────────────────────

  resolveBucket(scope: FileScope): string {
    return BUCKET_ROUTING[scope]?.bucket ?? FILE_BUCKETS.private;
  }

  resolveAccess(scope: FileScope): 'public' | 'private' {
    return BUCKET_ROUTING[scope]?.access ?? 'private';
  }

  /** 公开桶返回永久 CDN URL，私有桶返回 null（由 cdn-proxy 代理签名 URL） */
  async resolveCdnUrlFor(
    vendor: FileBucketVendor,
    bucket: string,
    key: string,
    templateId = '360:360:360:360',
  ): Promise<string | null> {
    try {
      return await this.fileCdn.getImageVolcengineCdn(vendor, bucket, key, templateId);
    } catch (error) {
      this.logger.warn('resolveCdnUrlFor failed', {
        bucket,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async resolveCdnUrl(id: string, options?: CdnUrlOptions): Promise<string | null> {
    const file = await this.fileSourceDb.getById(id, {
      select: { vendor: true, bucket: true, key: true, access: true },
    });
    if (!file) return null;
    const templateId = this.buildTemplateId(options);
    return this.resolveCdnUrlFor(file.vendor, file.bucket, file.key, templateId);
  }

  // ─── Queries ────────────────────────────────────────────────────────

  async getById(id: string): Promise<FileDto> {
    const file = await this.fileSourceDb.getOrThrow({ id });
    return this.toFileDto(file);
  }

  async list(
    query: {
      scope?: FileScope;
      tenantId?: string;
      teamId?: string;
      uploadedBy?: string;
      mimeType?: string;
      isUploaded?: boolean;
      access?: 'public' | 'private';
      search?: string;
      limit?: number;
      page?: number;
      sort?: string;
      asc?: 'asc' | 'desc';
    },
  ): Promise<{ list: FileDto[]; total: number; totalSize: number; page: number; limit: number }> {
    const { limit = 20, page = 1, sort = 'createdAt', asc = 'desc', ...filters } = query;
    const where: Prisma.FileSourceWhereInput = {};
    if (filters.scope) where.scope = filters.scope;
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.teamId) where.teamId = filters.teamId;
    if (filters.uploadedBy) where.uploadedBy = filters.uploadedBy;
    if (filters.mimeType) where.mimeType = { startsWith: filters.mimeType };
    if (filters.isUploaded !== undefined) where.isUploaded = filters.isUploaded;
    if (filters.access) where.access = filters.access;
    if (filters.search) where.filename = { contains: filters.search };

    const result = await this.fileSourceDb.list(where, {
      orderBy: { [sort]: asc } as Prisma.FileSourceOrderByWithRelationInput,
      limit,
      page,
    });
    const list = await Promise.all(result.list.map((f) => this.toFileDto(f)));
    // MVP：totalSize 用当前页汇总近似（后续可扩展 FileSourceService 聚合查询）
    const totalSize = list.reduce((sum, f) => sum + f.fsize, 0);
    return { list, total: result.total, totalSize, page: result.page, limit: result.limit };
  }

  async batchGet(ids: string[]): Promise<{ data: FileDto[]; notFound: string[] }> {
    const result = await this.fileSourceDb.list({ id: { in: ids } }, { limit: ids.length });
    const found = new Map(result.list.map((f) => [f.id, f]));
    const data: FileDto[] = [];
    const notFound: string[] = [];
    for (const id of ids) {
      const f = found.get(id);
      if (f) data.push(await this.toFileDto(f));
      else notFound.push(id);
    }
    return { data, notFound };
  }

  async updateMetadata(
    id: string,
    data: {
      filename?: string;
      scope?: FileScope;
      access?: 'public' | 'private';
      teamId?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<FileDto> {
    const updateData: Prisma.FileSourceUpdateInput = {};
    if (data.filename !== undefined) updateData.filename = data.filename;
    if (data.scope !== undefined) {
      updateData.scope = data.scope;
      const routing = BUCKET_ROUTING[data.scope];
      if (routing) updateData.access = routing.access;
    }
    if (data.access !== undefined) updateData.access = data.access;
    if (data.teamId !== undefined) updateData.teamId = data.teamId;
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata as Prisma.InputJsonValue;
    }
    const file = await this.fileSourceDb.update({ id }, updateData);
    return this.toFileDto(file);
  }

  async softDelete(id: string): Promise<void> {
    await this.fileSourceDb.softDelete({ id });
  }

  // ─── Server-side ingestion ──────────────────────────────────────────

  async uploadFromUrl(
    dto: {
      url: string;
      scope: FileScope;
      filename?: string;
      tenantId?: string;
      teamId?: string;
      metadata?: Record<string, unknown>;
    },
    context: FileRequestContext = {},
  ) {
    const { url, scope, filename, tenantId, teamId, metadata } = dto;
    const bucket = this.resolveBucket(scope);
    const access = this.resolveAccess(scope);
    const ext = filename ? fileUtil.getFileExtension(filename) ?? '' : '';
    const key = await this.fileStorage.formatNewKeyString(scope, ext, bucket);

    const result = await this.fileStorage.fetchToBucket(DEFAULT_VENDOR, bucket, key, url);

    const fileSource = await this.fileSourceDb.create({
      key,
      bucket,
      vendor: DEFAULT_VENDOR,
      region: DEFAULT_REGION,
      fsize: result?.fsize ?? 0,
      mimeType: result?.mimeType ?? 'application/octet-stream',
      ext: ext || '',
      isUploaded: true,
      scope,
      access,
      tenantId: tenantId ?? undefined,
      teamId: teamId ?? undefined,
      uploadedBy: context.userId ?? undefined,
      filename: filename ?? null,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    });

    const cdnUrl =
      access === 'public'
        ? await this.resolveCdnUrlFor(fileSource.vendor, fileSource.bucket, fileSource.key)
        : null;

    return {
      fileId: fileSource.id,
      key: fileSource.key,
      bucket: fileSource.bucket,
      cdnUrl,
      fsize: fileSource.fsize,
      mimeType: fileSource.mimeType,
      width: null,
      height: null,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  async toFileDto(file: FileSource): Promise<FileDto> {
    const cdnUrl =
      file.access === 'public' && file.isUploaded
        ? await this.resolveCdnUrlFor(file.vendor, file.bucket, file.key)
        : null;
    return {
      id: file.id,
      key: file.key,
      bucket: file.bucket,
      vendor: file.vendor,
      region: file.region,
      filename: file.filename ?? null,
      fsize: file.fsize,
      mimeType: file.mimeType,
      ext: file.ext,
      sha256: file.sha256 ?? null,
      hash: file.hash ?? null,
      scope: (file.scope as FileScope) ?? 'general',
      access: (file.access as 'public' | 'private') ?? 'public',
      tenantId: file.tenantId ?? null,
      teamId: file.teamId ?? null,
      uploadedBy: file.uploadedBy ?? null,
      metadata: this.toRecord(file.metadata),
      isUploaded: file.isUploaded,
      status: file.status,
      cdnUrl,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  private buildTemplateId(options?: CdnUrlOptions): string {
    if (!options?.template || options.template === 'origin') return 'origin';
    if (options.template === 'preview') return 'preview';
    if (options.template === 'video_snapshot') return 'video_snapshot';
    const w = options.width ?? 360;
    const h = options.height ?? 360;
    return `${w}:${h}:${w}:${h}`;
  }

  private toRecord(value: Prisma.JsonValue): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value;
  }
}
