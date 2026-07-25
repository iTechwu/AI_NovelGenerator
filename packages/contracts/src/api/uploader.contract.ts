import { initContract } from '@ts-rest/core';
import { ApiResponseSchema, withVersion, API_VERSION } from '../base';
import {
  PublicTokenRequestSchema,
  PrivateTokenRequestSchema,
  PrivateAbortRequestSchema,
  PrivateCompletedRequestSchema,
  TokenResponseSchema,
  FileSourceResponseSchema,
  UploaderSuccessResponseSchema,
} from '../schemas/uploader.schema';
import { UploadFromUrlRequestSchema, UploadFromUrlResponseSchema } from '../schemas/file.schema';

const c = initContract();

/**
 * Uploader API Contract（本地预签名直传 + 分片上传）。
 * 浏览器先向后端换取预签名 URL，再直传对象存储，最后回调 complete 标记完成。
 */
export const uploaderContract = c.router(
  {
    /** POST /uploader/token/private/thumb — 缩略图上传 token */
    getPrivateThumbToken: {
      method: 'POST',
      path: '/token/private/thumb',
      body: PublicTokenRequestSchema,
      responses: { 200: ApiResponseSchema(TokenResponseSchema) },
      summary: '获取缩略图上传 token',
    },

    /** POST /uploader/init/multipart — 初始化分片上传 */
    initMultipart: {
      method: 'POST',
      path: '/init/multipart',
      body: PrivateTokenRequestSchema,
      responses: { 200: ApiResponseSchema(TokenResponseSchema) },
      summary: '初始化分片上传',
    },

    /** POST /uploader/token/multipart — 获取分片上传 token */
    getMultipartToken: {
      method: 'POST',
      path: '/token/multipart',
      body: PrivateTokenRequestSchema,
      responses: { 200: ApiResponseSchema(TokenResponseSchema) },
      summary: '获取分片上传 token',
    },

    /** POST /uploader/token/private — 获取单文件预签名上传 token */
    getPrivateToken: {
      method: 'POST',
      path: '/token/private',
      body: PrivateTokenRequestSchema,
      responses: { 200: ApiResponseSchema(TokenResponseSchema) },
      summary: '获取单文件预签名上传 token',
    },

    /** POST /uploader/abort — 取消上传（软删除 FileSource） */
    abort: {
      method: 'POST',
      path: '/abort',
      body: PrivateAbortRequestSchema,
      responses: { 200: ApiResponseSchema(UploaderSuccessResponseSchema) },
      summary: '取消上传',
    },

    /** POST /uploader/complete — 完成上传（标记 isUploaded=true） */
    complete: {
      method: 'POST',
      path: '/complete',
      body: PrivateCompletedRequestSchema,
      responses: { 200: ApiResponseSchema(FileSourceResponseSchema) },
      summary: '完成上传',
    },

    /** POST /uploader/from-url — 从 URL 拉取文件入库 */
    uploadFromUrl: {
      method: 'POST',
      path: '/from-url',
      body: UploadFromUrlRequestSchema,
      responses: { 200: ApiResponseSchema(UploadFromUrlResponseSchema) },
      summary: '从 URL 上传文件',
      description: '从给定 URL 下载文件并上传到对象存储，返回 fileId + cdnUrl',
    },
  },
  {
    pathPrefix: '/uploader',
  },
);

export const uploaderContractVersioned = withVersion(uploaderContract, {
  version: API_VERSION.V1,
  pathPrefix: '/uploader',
});

export type UploaderContract = typeof uploaderContract;
