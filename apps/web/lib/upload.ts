'use client';

import { useState } from 'react';
import { uploaderClient } from './api/contracts/client';

/**
 * 本地文件上传工具（浏览器预签名直传到对象存储）。
 *
 * 流程：getPrivateToken 拿预签名 PUT URL → XHR 直传文件 → complete 标记完成。
 * signature 使用魔法值 'browser-upload'（已登录用户跳过 HMAC 校验）。
 * 进度回调基于 XHR.upload.onprogress。
 */

const BROWSER_SIGNATURE = 'browser-upload';

export interface UploadResult {
  fileId: string;
  key: string;
  cdnUrl: string | null;
  bucket?: string;
}

export interface UploadOptions {
  scope?: string;
  onProgress?: (loaded: number, total: number) => void;
}

export async function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const { scope = 'general', onProgress } = options;

  const tokenRes = await uploaderClient.getPrivateToken({
    body: {
      signature: BROWSER_SIGNATURE,
      filename: file.name,
      fsize: file.size,
      scope: scope as never,
    },
  });
  const tokenBody = tokenRes.body as
    | {
        data?: {
          token: string;
          key: string;
          fileId: string;
          bucket?: string;
          cdnUrl?: string | null;
        };
      }
    | undefined;
  const tokenData = tokenBody?.data;
  if (!tokenData?.token) throw new Error('获取上传凭证失败');

  await putToStorage(tokenData.token, file, onProgress);

  const completeRes = await uploaderClient.complete({
    body: { signature: BROWSER_SIGNATURE, fileId: tokenData.fileId },
  });
  const completeBody = completeRes.body as
    | { data?: { id: string; key: string; cdnUrl?: string | null } }
    | undefined;
  const completeData = completeBody?.data;

  return {
    fileId: completeData?.id ?? tokenData.fileId,
    key: completeData?.key ?? tokenData.key,
    cdnUrl: completeData?.cdnUrl ?? tokenData.cdnUrl ?? null,
    bucket: tokenData.bucket,
  };
}

function putToStorage(
  url: string,
  file: File,
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.withCredentials = false;
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`上传失败: HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error('网络错误，上传失败'));
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => onProgress(e.loaded, e.total);
    }
    xhr.send(file);
  });
}

/**
 * 文件上传 React hook（封装 loading / progress / error）。
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File, options?: UploadOptions): Promise<UploadResult | undefined> {
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      return await uploadFile(file, {
        ...options,
        onProgress: (loaded, total) => setProgress(total > 0 ? loaded / total : 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      return undefined;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, progress, error };
}
