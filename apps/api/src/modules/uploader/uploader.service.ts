import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@dofe/infra-common';
import {
  FileCdnClient,
  FileStorageService,
  UploaderService as InfraUploaderService,
} from '@dofe/infra-shared-services';
import { fileUtil } from '@dofe/infra-utils';
import { FileSourceService } from '@app/db';
import type { FileBucketVendor, Prisma } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import {
  FileDomainService,
  type FileRequestContext,
  type FileScope,
} from '@app/services/file';

const BROWSER_UPLOAD_SIGNATURE = 'browser-upload';

/**
 * 上传编排（预签名直传 + 分片）。
 * 浏览器端带 `signature: 'browser-upload'` 即跳过 HMAC 校验（已登录用户）。
 */
@Injectable()
export class UploaderService {
  private readonly appConfig: AppConfig;

  constructor(
    private readonly infraUploader: InfraUploaderService,
    private readonly fileSourceDb: FileSourceService,
    private readonly fileStorage: FileStorageService,
    private readonly fileCdn: FileCdnClient,
    private readonly fileDomain: FileDomainService,
    configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.appConfig = configService.getOrThrow<AppConfig>('app');
  }

  getVendor(bodyVendor?: string): FileBucketVendor {
    return (bodyVendor ?? this.appConfig.defaultVendor) as FileBucketVendor;
  }

  private validateSignature<T extends { signature: string; sha256?: string }>(
    userId: string,
    body: T,
  ): { sha256?: string } {
    if (body.signature === BROWSER_UPLOAD_SIGNATURE && userId) {
      return { sha256: body.sha256 };
    }
    return this.infraUploader.checkValidateAndReturnSignatureData(userId, body);
  }

  async getPrivateThumbToken(userId: string, body: { signature: string }, ip: string) {
    this.infraUploader.checkValidateAndReturnSignatureData(userId, body);
    return this.infraUploader.uploadThumbToken(userId, body, ip);
  }

  async initMultipart(
    context: FileRequestContext,
    body: {
      signature: string;
      filename: string;
      fsize: number;
      vendor?: string;
      locale?: string;
      sha256?: string;
      scope?: FileScope;
      tenantId?: string;
      teamId?: string;
      metadata?: Record<string, unknown>;
    },
    ip: string,
  ) {
    const vendor = this.getVendor(body.vendor);
    this.validateSignature(context.userId ?? '', { ...body, vendor });
    const scope = body.scope ?? 'general';
    const bucket = this.fileDomain.resolveBucket(scope);
    const access = this.fileDomain.resolveAccess(scope);
    const ext = fileUtil.getFileExtension(body.filename) ?? '';
    const key = await this.fileStorage.formatNewKeyString(scope, ext, bucket);

    const fileSource = await this.fileSourceDb.create({
      key,
      bucket,
      vendor,
      fsize: body.fsize,
      mimeType: fileUtil.getMimeType(body.filename),
      ext: ext || '',
      sha256: body.sha256 ?? undefined,
      isUploaded: false,
      scope,
      access,
      tenantId: body.tenantId ?? undefined,
      teamId: body.teamId ?? undefined,
      uploadedBy: context.userId ?? undefined,
      filename: body.filename,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });

    const uploadId = await this.fileStorage.getMultipartUploadId(vendor, bucket, key, ip);
    const token = await this.fileStorage.getPresignedUrl(vendor, bucket, {
      uploadId,
      key,
      partNumber: 1,
    });

    const cdnUrl =
      access === 'public' ? await this.fileDomain.resolveCdnUrlFor(vendor, bucket, key) : null;

    return {
      token,
      key,
      fileId: fileSource.id,
      bucket,
      url: uploadId,
      cdnUrl,
      access,
      cdnUrlPermanent: access === 'public',
    };
  }

  async getMultipartToken(
    userId: string,
    body: { signature: string; key?: string; bucket?: string },
    ip: string,
  ) {
    this.validateSignature(userId, body);
    const result = await this.infraUploader.getUploaderPresignedUrl(body, ip);
    const defaultBucket = await this.fileStorage.getDefaultBucket();
    return {
      token: result.token,
      key: result.fileKey,
      fileId: body.key || result.fileKey,
      bucket: body.bucket || defaultBucket,
    };
  }

  async getPrivateToken(
    context: FileRequestContext,
    body: {
      signature: string;
      filename: string;
      fsize: number;
      vendor?: string;
      locale?: string;
      sha256?: string;
      scope?: FileScope;
      tenantId?: string;
      teamId?: string;
      metadata?: Record<string, unknown>;
    },
    ip: string,
  ) {
    const vendor = this.getVendor(body.vendor);
    const signatureData = this.validateSignature(context.userId ?? '', { ...body, vendor });
    const scope = body.scope ?? 'general';
    const bucket = this.fileDomain.resolveBucket(scope);
    const access = this.fileDomain.resolveAccess(scope);
    const ext = fileUtil.getFileExtension(body.filename) ?? '';
    const key = await this.fileStorage.formatNewKeyString(scope, ext, bucket);

    const fileSource = await this.fileSourceDb.create({
      key,
      bucket,
      vendor,
      fsize: body.fsize,
      mimeType: fileUtil.getMimeType(body.filename),
      ext: ext || '',
      sha256: body.sha256 ?? signatureData.sha256 ?? undefined,
      isUploaded: false,
      scope,
      access,
      tenantId: body.tenantId ?? undefined,
      teamId: body.teamId ?? undefined,
      uploadedBy: context.userId ?? undefined,
      filename: body.filename,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });

    const result = await this.infraUploader.uploadTokenWithCallback(
      vendor,
      bucket,
      key,
      ip,
      body.locale,
    );
    const cfg = await this.fileStorage.getFileServiceConfig(vendor, bucket, ip);
    const cdnUrl =
      access === 'public' ? await this.fileDomain.resolveCdnUrlFor(vendor, bucket, key) : null;

    return {
      token: result.token,
      key: result.fileKey,
      fileId: fileSource.id,
      bucket,
      url: `${cfg.domain}/${result.fileKey}`,
      cdnUrl,
      access,
      cdnUrlPermanent: access === 'public',
    };
  }

  async abort(userId: string, fileId: string, signature: string) {
    this.validateSignature(userId, { signature });
    const file = await this.fileSourceDb.getById(fileId, { select: { uploadedBy: true } });
    if (!file) throw new NotFoundException('File not found');
    if (file.uploadedBy !== userId) {
      throw new ForbiddenException('No permission to abort this upload');
    }
    await this.fileSourceDb.update({ id: fileId }, { isDeleted: true });
  }

  async complete(userId: string, fileId: string, signature: string) {
    this.validateSignature(userId, { signature });
    const existing = await this.fileSourceDb.getById(fileId, {
      select: { uploadedBy: true },
    });
    if (!existing) throw new NotFoundException('File not found');
    if (existing.uploadedBy !== userId) {
      throw new ForbiddenException('No permission to complete this upload');
    }
    const fileSource = await this.fileSourceDb.update({ id: fileId }, { isUploaded: true });
    const cfg = await this.fileStorage.getFileServiceConfig(fileSource.vendor, fileSource.bucket);
    const cdnUrl =
      fileSource.access === 'public'
        ? await this.fileDomain.resolveCdnUrlFor(
            fileSource.vendor,
            fileSource.bucket,
            fileSource.key,
          )
        : null;
    return {
      id: fileSource.id,
      key: fileSource.key,
      bucket: fileSource.bucket,
      fsize: fileSource.fsize,
      mimeType: fileSource.mimeType,
      ext: fileSource.ext,
      sha256: fileSource.sha256 ?? undefined,
      isUploaded: fileSource.isUploaded,
      url: `${cfg.domain}/${fileSource.key}`,
      cdnUrl,
    };
  }

  async uploadFromUrl(dto: Parameters<FileDomainService['uploadFromUrl']>[0], context: FileRequestContext) {
    return this.fileDomain.uploadFromUrl(dto, context);
  }
}
