import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { API_VERSION, ApiResponseSchema, withVersion } from '../base';
import {
  FileListQuerySchema,
  FileListResponseSchema,
  FileDetailResponseSchema,
  UpdateFileSchema,
  BatchFileQuerySchema,
  BatchFileResponseSchema,
  CdnUrlQuerySchema,
  CdnUrlResponseSchema,
  FileStatsQuerySchema,
  FileStatsResponseSchema,
} from '../schemas/file.schema';

const c = initContract();

/**
 * File API Contract（本地文件管理）。
 * 提供文件 CRUD、CDN URL 解析、批量查询、统计等能力。
 */
export const fileContract = c.router(
  {
    /** GET /files — 文件列表查询 */
    list: {
      method: 'GET',
      path: '/',
      query: FileListQuerySchema,
      responses: { 200: ApiResponseSchema(FileListResponseSchema) },
      summary: '获取文件列表',
      description: '查询文件列表，支持按 scope/tenantId/mimeType/isUploaded 等过滤',
    },

    /** GET /files/:id — 获取文件详情 */
    getById: {
      method: 'GET',
      path: '/:id',
      pathParams: z.object({ id: z.string().uuid() }),
      responses: { 200: ApiResponseSchema(FileDetailResponseSchema) },
      summary: '获取文件详情',
    },

    /** PATCH /files/:id — 更新文件元数据 */
    update: {
      method: 'PATCH',
      path: '/:id',
      pathParams: z.object({ id: z.string().uuid() }),
      body: UpdateFileSchema,
      responses: { 200: ApiResponseSchema(FileDetailResponseSchema) },
      summary: '更新文件元数据',
    },

    /** DELETE /files/:id — 软删除文件 */
    delete: {
      method: 'DELETE',
      path: '/:id',
      pathParams: z.object({ id: z.string().uuid() }),
      responses: { 200: ApiResponseSchema(z.object({ success: z.boolean() })) },
      summary: '软删除文件',
    },

    /** GET /files/:id/url — 获取 CDN URL（支持图片处理参数） */
    getCdnUrl: {
      method: 'GET',
      path: '/:id/url',
      pathParams: z.object({ id: z.string().uuid() }),
      query: CdnUrlQuerySchema,
      responses: { 200: ApiResponseSchema(CdnUrlResponseSchema) },
      summary: '获取文件的 CDN URL',
      description: '支持图片处理模板和参数（缩略图、格式转换、质量调整等）',
    },

    /** GET /files/stats — 文件统计 */
    stats: {
      method: 'GET',
      path: '/stats',
      query: FileStatsQuerySchema,
      responses: { 200: ApiResponseSchema(FileStatsResponseSchema) },
      summary: '获取文件统计',
      description: '查询文件大小、数量统计，支持按 scope/access/tenantId 等维度聚合',
    },

    /** POST /files/batch — 批量查询文件 */
    batchGet: {
      method: 'POST',
      path: '/batch',
      body: BatchFileQuerySchema,
      responses: { 200: ApiResponseSchema(BatchFileResponseSchema) },
      summary: '批量查询文件',
      description: '根据文件 ID 列表批量获取文件信息，最多 100 个',
    },
  },
  {
    pathPrefix: '/files',
  },
);

export const fileContractVersioned = withVersion(fileContract, {
  version: API_VERSION.V1,
  pathPrefix: '/files',
});

export type FileContract = typeof fileContract;
