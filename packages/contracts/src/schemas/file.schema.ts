import { z } from 'zod';
import { PaginationQuerySchema, PaginatedResponseSchema } from '../base';

/**
 * 本地文件管理 Schema（hanlin.ai 自主文件服务）。
 * tenantId/teamId 字段保留为可选，便于日后接入多租户；本期后端不强制消费。
 */

// ─── Enums ────────────────────────────────────────────────────────────

/** 存储厂商（镜像 Prisma FileBucketVendor enum） */
export const FileVendorSchema = z.enum([
  'oss',
  'us3',
  'qiniu',
  's3',
  'gcs',
  'tos',
  'tencent',
  'ksyun',
]);
export type FileVendor = z.infer<typeof FileVendorSchema>;

/** 文件用途分类 */
export const FileScopeSchema = z.enum([
  'avatar',
  'logo',
  'media_asset',
  'knowledge',
  'general',
  'system',
]);
export type FileScope = z.infer<typeof FileScopeSchema>;

/** 文件访问级别 */
export const FileAccessSchema = z.enum(['public', 'private']);
export type FileAccess = z.infer<typeof FileAccessSchema>;

// ─── File Item ─────────────────────────────────────────────────────────

export const FileItemSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  bucket: z.string(),
  vendor: FileVendorSchema,
  region: z.string(),
  filename: z.string().nullable(),
  fsize: z.number(),
  mimeType: z.string(),
  ext: z.string(),
  sha256: z.string().nullable(),
  hash: z.string().nullable(),
  scope: FileScopeSchema,
  access: FileAccessSchema,
  tenantId: z.string().uuid().nullable(),
  teamId: z.string().uuid().nullable(),
  uploadedBy: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  isUploaded: z.boolean(),
  status: z.number(),
  cdnUrl: z.string().url().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type FileItem = z.infer<typeof FileItemSchema>;

// ─── File List Query ────────────────────────────────────────────────────

export const FileListQuerySchema = PaginationQuerySchema.extend({
  scope: FileScopeSchema.optional(),
  tenantId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  uploadedBy: z.string().uuid().optional(),
  mimeType: z.string().optional(),
  isUploaded: z.boolean().optional(),
  access: FileAccessSchema.optional(),
  search: z.string().optional(),
}).strict();
export type FileListQuery = z.infer<typeof FileListQuerySchema>;

// ─── File List Response ─────────────────────────────────────────────────

export const FileListResponseSchema = PaginatedResponseSchema(FileItemSchema).extend({
  totalSize: z.number(),
});
export type FileListResponse = z.infer<typeof FileListResponseSchema>;

// ─── File Detail (GET /:id) ─────────────────────────────────────────────

export const FileDetailResponseSchema = FileItemSchema;
export type FileDetailResponse = z.infer<typeof FileDetailResponseSchema>;

// ─── Update File ────────────────────────────────────────────────────────

export const UpdateFileSchema = z.object({
  filename: z.string().optional(),
  scope: FileScopeSchema.optional(),
  access: FileAccessSchema.optional(),
  teamId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateFile = z.infer<typeof UpdateFileSchema>;

// ─── Batch Query ────────────────────────────────────────────────────────

export const BatchFileQuerySchema = z.object({
  ids: z.array(z.string().uuid()).max(100),
});
export type BatchFileQuery = z.infer<typeof BatchFileQuerySchema>;

export const BatchFileResponseSchema = z.object({
  data: z.array(FileItemSchema),
  notFound: z.array(z.string()),
});
export type BatchFileResponse = z.infer<typeof BatchFileResponseSchema>;

// ─── CDN URL ────────────────────────────────────────────────────────────

/** 图片处理模板 */
export const ImageTemplateSchema = z.enum(['origin', 'preview', 'thumb', 'video_snapshot']);
export type ImageTemplate = z.infer<typeof ImageTemplateSchema>;

export const CdnUrlQuerySchema = z.object({
  template: ImageTemplateSchema.optional(),
  width: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  format: z.enum(['webp', 'png', 'jpg']).optional(),
  quality: z.coerce.number().min(1).max(100).optional(),
});
export type CdnUrlQuery = z.infer<typeof CdnUrlQuerySchema>;

export const CdnUrlResponseSchema = z.object({
  url: z.string().url(),
  template: ImageTemplateSchema.optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  format: z.string().optional(),
});
export type CdnUrlResponse = z.infer<typeof CdnUrlResponseSchema>;

// ─── Upload From URL ────────────────────────────────────────────────────

export const UploadFromUrlRequestSchema = z.object({
  url: z.string().url(),
  scope: FileScopeSchema,
  filename: z.string().optional(),
  tenantId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UploadFromUrlRequest = z.infer<typeof UploadFromUrlRequestSchema>;

export const UploadFromUrlResponseSchema = z.object({
  fileId: z.string().uuid(),
  key: z.string(),
  bucket: z.string(),
  cdnUrl: z.string().url().nullable(),
  fsize: z.number(),
  mimeType: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});
export type UploadFromUrlResponse = z.infer<typeof UploadFromUrlResponseSchema>;

// ─── Internal Upload Content ───────────────────────────────────────────

export const UploadContentRequestSchema = z.object({
  contentBase64: z.string().min(1),
  scope: FileScopeSchema,
  filename: z.string().min(1),
  mimeType: z.string().min(1).optional(),
  sha256: z.string().optional(),
  tenantId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UploadContentRequest = z.infer<typeof UploadContentRequestSchema>;

export const UploadContentResponseSchema = z.object({
  fileId: z.string().uuid(),
  key: z.string(),
  bucket: z.string(),
  cdnUrl: z.string().url().nullable(),
  fsize: z.number(),
  mimeType: z.string(),
  sha256: z.string().nullable(),
});
export type UploadContentResponse = z.infer<typeof UploadContentResponseSchema>;

// ─── Internal Download URL ─────────────────────────────────────────────

export const GetDownloadUrlRequestSchema = z.object({
  ttl: z.number().positive().optional().default(3600),
  internal: z.boolean().optional().default(false),
});
export type GetDownloadUrlRequest = z.infer<typeof GetDownloadUrlRequestSchema>;

export const DownloadUrlResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  expiresAt: z.coerce.date(),
});
export type DownloadUrlResponse = z.infer<typeof DownloadUrlResponseSchema>;

// ─── Batch Resolve CDN URL ──────────────────────────────────────────────

export const BatchResolveCdnUrlRequestSchema = z.object({
  ids: z.array(z.string().uuid()).max(100),
  tenantId: z.string().uuid().optional(),
  ttl: z.number().positive().optional().default(3600),
});
export type BatchResolveCdnUrlRequest = z.infer<typeof BatchResolveCdnUrlRequestSchema>;

export const ResolvedCdnUrlSchema = z.object({
  id: z.string().uuid(),
  signedUrl: z.string().url(),
  expiresAt: z.coerce.date(),
});

export const BatchResolveCdnUrlResponseSchema = z.object({
  data: z.array(ResolvedCdnUrlSchema),
});
export type BatchResolveCdnUrlResponse = z.infer<typeof BatchResolveCdnUrlResponseSchema>;

// ─── File Stats ──────────────────────────────────────────────────────────

export const FileStatsGroupBySchema = z.enum([
  'scope',
  'access',
  'tenantId',
  'teamId',
  'uploadedBy',
]);
export type FileStatsGroupBy = z.infer<typeof FileStatsGroupBySchema>;

export const FileStatsQuerySchema = z.object({
  scope: FileScopeSchema.optional(),
  access: FileAccessSchema.optional(),
  tenantId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  uploadedBy: z.string().uuid().optional(),
  groupBy: z.preprocess((value) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return value;
  }, z.array(FileStatsGroupBySchema).max(5).optional()),
});
export type FileStatsQuery = z.infer<typeof FileStatsQuerySchema>;

export const FileStatsBucketSchema = z.object({
  key: z.string(),
  dimensions: z.record(z.string(), z.string().nullable()),
  totalFiles: z.number(),
  totalSize: z.number(),
});
export type FileStatsBucket = z.infer<typeof FileStatsBucketSchema>;

export const FileStatsResponseSchema = z.object({
  totalFiles: z.number(),
  totalSize: z.number(),
  breakdown: z.array(FileStatsBucketSchema).optional(),
});
export type FileStatsResponse = z.infer<typeof FileStatsResponseSchema>;
