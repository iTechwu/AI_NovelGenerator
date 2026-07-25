import { Controller, VERSION_NEUTRAL } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { success } from '@dofe/infra-common/ts-rest/response.helper';
import { SimpleAuth } from '@app/auth';
import { fileContract as c } from '@repo/contracts';
import { FileApiService } from './file-api.service';

@SimpleAuth()
@Controller({ version: VERSION_NEUTRAL })
export class FileApiController {
  constructor(private readonly fileApi: FileApiService) {}

  @TsRestHandler(c.list)
  async list() {
    return tsRestHandler(c.list, async ({ query }) => success(await this.fileApi.list(query)));
  }

  @TsRestHandler(c.getById)
  async getById() {
    return tsRestHandler(c.getById, async ({ params }) =>
      success(await this.fileApi.getById(params.id)),
    );
  }

  @TsRestHandler(c.update)
  async update() {
    return tsRestHandler(c.update, async ({ params, body }) =>
      success(await this.fileApi.update(params.id, body)),
    );
  }

  @TsRestHandler(c.delete)
  async delete() {
    return tsRestHandler(c.delete, async ({ params }) =>
      success(await this.fileApi.delete(params.id)),
    );
  }

  @TsRestHandler(c.getCdnUrl)
  async getCdnUrl() {
    return tsRestHandler(c.getCdnUrl, async ({ params, query }) =>
      success(await this.fileApi.getCdnUrl(params.id, query)),
    );
  }

  @TsRestHandler(c.stats)
  async stats() {
    return tsRestHandler(c.stats, async ({ query }) => success(await this.fileApi.stats(query)));
  }

  @TsRestHandler(c.batchGet)
  async batchGet() {
    return tsRestHandler(c.batchGet, async ({ body }) => success(await this.fileApi.batchGet(body.ids)));
  }
}
