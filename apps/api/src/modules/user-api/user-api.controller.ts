import { Controller, Req } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { userContract } from '@repo/contracts';
import { AuthenticatedRequest } from '@app/auth';
import { UserApiService } from './user-api.service';

@Controller()
export class UserApiController {
  constructor(private readonly userApi: UserApiService) {}

  @TsRestHandler(userContract.check)
  async check(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(userContract.check, async () => {
      const data = await this.userApi.check(req.userId);
      return { status: 200 as const, body: { code: 200, msg: 'ok', data } };
    });
  }

  @TsRestHandler(userContract.getInfo)
  async getInfo(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(userContract.getInfo, async () => {
      const data = await this.userApi.getInfo(req.userId);
      return { status: 200 as const, body: { code: 200, msg: 'ok', data } };
    });
  }

  @TsRestHandler(userContract.getContact)
  async getContact() {
    return tsRestHandler(userContract.getContact, async ({ params }) => {
      const data = await this.userApi.getContact(params.userId);
      return { status: 200 as const, body: { code: 200, msg: 'ok', data } };
    });
  }
}
