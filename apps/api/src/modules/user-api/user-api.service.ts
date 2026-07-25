import { Injectable } from '@nestjs/common';
import { apiError } from '@dofe/infra-common';
import { UserInfoService } from '@app/db';
import { AuthService } from '@app/auth';
import { UserErrorCode } from '@repo/contracts/errors';

@Injectable()
export class UserApiService {
  constructor(
    private readonly userInfoService: UserInfoService,
    private readonly auth: AuthService,
  ) {}

  /** GET /user/check — 返回当前登录 userId */
  async check(userId: string): Promise<{ userId: string }> {
    return { userId };
  }

  /** PATCH /user/profile — 更新当前用户资料，返回更新后的资料 */
  async updateProfile(
    userId: string,
    body: {
      nickname?: string;
      avatarFileId?: string | null;
      sex?: 'UNKNOWN' | 'MALE' | 'FEMALE';
      locale?: string;
    },
  ) {
    const user = await this.userInfoService.get({ id: userId });
    if (!user) throw apiError(UserErrorCode.UserNotFound);

    const data: {
      nickname?: string;
      avatarFileId?: string | null;
      sex?: 'UNKNOWN' | 'MALE' | 'FEMALE';
      locale?: string;
    } = {};
    if (body.nickname !== undefined) data.nickname = body.nickname;
    if (body.avatarFileId !== undefined) data.avatarFileId = body.avatarFileId;
    if (body.sex !== undefined) data.sex = body.sex;
    if (body.locale !== undefined) data.locale = body.locale;

    await this.userInfoService.update({ id: userId }, data);
    return this.getInfo(userId);
  }

  /** GET /user/info — 当前用户账号资料 */
  async getInfo(userId: string) {
    const user = await this.userInfoService.get({ id: userId });
    if (!user) throw apiError(UserErrorCode.UserNotFound);

    const headerImg = user.avatarFileId
      ? await this.auth.getAvatarUrl(user.avatarFileId)
      : undefined;

    return {
      id: user.id,
      code: user.code ?? null,
      nickname: user.nickname || null,
      headerImg: headerImg ?? null,
      sex: user.sex ?? null,
      mobile: user.mobile ?? null,
      email: user.email ?? null,
      ssoSub: user.ssoSub ?? null,
    };
  }

  /** GET /user/contact/:userId — 指定用户的联系信息 */
  async getContact(userId: string) {
    const user = await this.userInfoService.get({ id: userId });
    if (!user) throw apiError(UserErrorCode.UserNotFound);

    return {
      userId: user.id,
      nickname: user.nickname || null,
      mobile: user.mobile ?? null,
      email: user.email ?? null,
    };
  }
}
