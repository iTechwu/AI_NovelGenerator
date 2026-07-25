import { Controller, Req, VERSION_NEUTRAL } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { success } from '@dofe/infra-common/ts-rest/response.helper';
import { AuthenticatedRequest, SimpleAuth } from '@app/auth';
import { uploaderContract as c } from '@repo/contracts';
import type { FileRequestContext } from '@app/services/file';
import { UploaderService } from './uploader.service';

@SimpleAuth()
@Controller({ version: VERSION_NEUTRAL })
export class UploaderController {
  constructor(private readonly uploader: UploaderService) {}

  private ctx(req: AuthenticatedRequest): FileRequestContext {
    return { userId: req.userId, isAdmin: req.isAdmin };
  }

  private clientIp(req: AuthenticatedRequest): string {
    return req.ip ?? '';
  }

  @TsRestHandler(c.getPrivateThumbToken)
  async getPrivateThumbToken(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.getPrivateThumbToken, async ({ body }) => {
      const ip = this.clientIp(req);
      const result = await this.uploader.getPrivateThumbToken(req.userId, body, ip);
      const domain = (result as { domain?: string }).domain;
      return success({
        token: result.token,
        key: result.key,
        fileId: result.key,
        bucket: result.bucket,
        url: domain ? `${domain}/${result.key}` : undefined,
      });
    });
  }

  @TsRestHandler(c.initMultipart)
  async initMultipart(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.initMultipart, async ({ body }) => {
      const ip = this.clientIp(req);
      const result = await this.uploader.initMultipart(this.ctx(req), body, ip);
      return success(result);
    });
  }

  @TsRestHandler(c.getMultipartToken)
  async getMultipartToken(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.getMultipartToken, async ({ body }) => {
      const ip = this.clientIp(req);
      const result = await this.uploader.getMultipartToken(req.userId, body, ip);
      return success(result);
    });
  }

  @TsRestHandler(c.getPrivateToken)
  async getPrivateToken(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.getPrivateToken, async ({ body }) => {
      const ip = this.clientIp(req);
      const result = await this.uploader.getPrivateToken(this.ctx(req), body, ip);
      return success(result);
    });
  }

  @TsRestHandler(c.abort)
  async abort(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.abort, async ({ body }) => {
      await this.uploader.abort(req.userId, body.fileId, body.signature);
      return success({ success: true });
    });
  }

  @TsRestHandler(c.complete)
  async complete(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.complete, async ({ body }) => {
      const result = await this.uploader.complete(req.userId, body.fileId, body.signature);
      return success(result);
    });
  }

  @TsRestHandler(c.uploadFromUrl)
  async uploadFromUrl(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(c.uploadFromUrl, async ({ body }) => {
      const result = await this.uploader.uploadFromUrl(body, this.ctx(req));
      return success(result);
    });
  }
}
