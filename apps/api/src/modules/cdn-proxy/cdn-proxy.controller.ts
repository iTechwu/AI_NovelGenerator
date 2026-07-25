import { Controller, Get, HttpStatus, Inject, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { FileDomainService } from '@app/services/file';
import { SimpleAuth } from '@app/auth';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

/**
 * CDN 代理：GET /cdn/:fileId → 302 到签名 CDN URL。
 * 前端用 <img src="/cdn/{fileId}"> 访问私有桶文件，无需自管签名。
 */
@SimpleAuth()
@Controller('cdn')
export class CdnProxyController {
  constructor(
    private readonly fileDomain: FileDomainService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get(':fileId')
  async proxy(@Param('fileId') fileId: string, @Res() res: FastifyReply) {
    try {
      const url = await this.fileDomain.resolveCdnUrl(fileId);
      if (!url) {
        return res.status(HttpStatus.NOT_FOUND).send({ message: 'File not found' });
      }
      return res.status(HttpStatus.FOUND).redirect(url);
    } catch (err) {
      this.logger.error('CDN proxy error', { fileId, error: err });
      return res.status(HttpStatus.BAD_GATEWAY).send({ message: 'CDN resolution failed' });
    }
  }
}
