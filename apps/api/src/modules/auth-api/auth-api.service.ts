import { Injectable } from '@nestjs/common';
import { AuthService } from '@app/auth';

/**
 * Auth API 编排层（thin）。
 * 业务逻辑落在 `AuthService`；此处负责参数解包，便于后续插入 brute-force / 审计。
 */
@Injectable()
export class AuthApiService {
  constructor(private readonly auth: AuthService) {}

  loginByEmail(body: { email: string; password: string }) {
    return this.auth.loginByEmail(body.email, body.password);
  }

  loginByMobile(body: { mobile: string; password: string }) {
    return this.auth.loginByMobile(body.mobile, body.password);
  }

  loginBySms(body: { mobile: string; code: string }) {
    return this.auth.loginBySms(body.mobile, body.code);
  }

  registerByEmail(body: { email: string; password: string; nickname?: string }) {
    return this.auth.registerByEmail(body.email, body.password, body.nickname);
  }

  registerByMobile(body: {
    mobile: string;
    password?: string;
    nickname?: string;
  }) {
    return this.auth.registerByMobile(body.mobile, body.password, body.nickname);
  }

  refreshToken(refreshToken: string) {
    return this.auth.refreshSession(refreshToken);
  }

  logout(accessToken: string | undefined) {
    return this.auth.logoutByToken(accessToken);
  }

  sendSmsCode(body: { mobile: string; purpose: string }) {
    return this.auth.sendSmsCode(body.mobile, body.purpose);
  }

  sendEmailCode(body: { email: string; purpose: string }) {
    return this.auth.sendEmailCode(body.email, body.purpose);
  }

  changePassword(
    userId: string,
    body: { oldPassword: string; newPassword: string },
  ) {
    return this.auth.changePassword(userId, body.oldPassword, body.newPassword);
  }

  verifyEmail(body: { email: string; code: string }) {
    return this.auth.verifyEmail(body.email, body.code);
  }

  verifyMobile(body: { mobile: string; code: string }) {
    return this.auth.verifyMobile(body.mobile, body.code);
  }

  resetPassword(body: {
    email?: string;
    mobile?: string;
    code: string;
    newPassword: string;
  }) {
    return this.auth.resetPassword(body);
  }

  async verifyToken(accessToken: string | undefined): Promise<{
    valid: boolean;
    userId?: string;
  }> {
    if (!accessToken) return { valid: false };
    try {
      const { userId } = await this.auth.verifyAccessToken(accessToken);
      return { valid: true, userId };
    } catch {
      return { valid: false };
    }
  }
}
