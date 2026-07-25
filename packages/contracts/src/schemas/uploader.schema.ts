import { z } from 'zod';
import { FileScopeSchema, FileVendorSchema } from './file.schema';

/**
 * Uploader 相关 Schema（本地预签名直传 + 分片）。
 * FileVendorSchema / FileScopeSchema 复用 file.schema.ts 的定义，避免重复导出。
 */

/** 上传元数据（业务自定义字段，存入 FileSource.metadata） */
export const UploadMetadataSchema = z.object({
  customFields: z.record(z.string(), z.string()).optional(),
});
export type UploadMetadata = z.infer<typeof UploadMetadataSchema>;

/** 缩略图 token 请求 */
export const PublicTokenRequestSchema = z.object({
  signature: z.string().min(1),
  filename: z.string().min(1),
  vendor: FileVendorSchema.optional(),
  /** @deprecated 桶由后端按 scope 路由，调用方传入的 bucket 会被忽略 */
  bucket: z.string().optional(),
  locale: z.enum(['en', 'zh-CN']).optional(),
});

/** 预签名 token 请求（含元数据） */
export const PrivateTokenRequestSchema = z.object({
  signature: z.string().min(1),
  filename: z.string().min(1),
  fsize: z.number().positive(),
  vendor: FileVendorSchema.optional(),
  /** @deprecated 桶由后端按 scope 路由，调用方传入的 bucket 会被忽略 */
  bucket: z.string().optional(),
  key: z.string().optional(),
  sha256: z.string().optional(),
  scope: FileScopeSchema.optional(),
  tenantId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  uploadId: z.string().optional(),
  partNumber: z.number().int().positive().optional(),
  locale: z.enum(['en', 'zh-CN']).optional(),
  metadata: UploadMetadataSchema.optional(),
});
export type PrivateTokenRequest = z.infer<typeof PrivateTokenRequestSchema>;

/** 取消上传 */
export const PrivateAbortRequestSchema = z.object({
  signature: z.string().min(1),
  fileId: z.string().uuid(),
});

/** 完成上传 */
export const PrivateCompletedRequestSchema = z.object({
  signature: z.string().min(1),
  fileId: z.string().uuid(),
});

/**
 * Token 响应。
 * NOTE: `url` 为 z.string()（非 .url()），因为 initMultipart 在此返回 uploadId，
 *       而 getPrivateToken 返回域名 URL。
 */
export const TokenResponseSchema = z.object({
  token: z.string(),
  key: z.string(),
  fileId: z.string().uuid(),
  bucket: z.string(),
  url: z.string().optional(),
  /** CDN URL（公开桶返回永久 URL，私有桶返回 null） */
  cdnUrl: z.string().url().nullable().optional(),
  /** 访问级别：public / private */
  access: z.enum(['public', 'private']).optional(),
  /** CDN URL 是否为永久地址 */
  cdnUrlPermanent: z.boolean().optional(),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/** 完成上传响应（FileSource 摘要） */
export const FileSourceResponseSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  bucket: z.string(),
  fsize: z.number(),
  mimeType: z.string(),
  ext: z.string(),
  sha256: z.string().optional(),
  isUploaded: z.boolean(),
  url: z.string().url().optional(),
  cdnUrl: z.string().url().nullable().optional(),
});
export type FileSourceResponse = z.infer<typeof FileSourceResponseSchema>;

export const UploaderSuccessResponseSchema = z.object({
  success: z.boolean(),
});
