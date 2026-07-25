import { Controller, Req, Res } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { FastifyReply } from 'fastify';
import { authContract, type LoginSuccess } from '@repo/contracts';
import { CommonErrorCode } from '@repo/contracts/errors';
import { apiError } from '@dofe/infra-common';
import { environmentUtil } from '@dofe/infra-utils';
import {
  AuthenticatedRequest,
  Public,
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from '@app/auth';
import { AuthApiService } from './auth-api.service';

/**
 * 本地账号密码认证 Controller（ts-rest）。
 *
 * - public 端点（登录/注册/刷新/验证码/重置/verifyToken）用 `@Public()`。
 * - refresh_token 只通过 HttpOnly cookie `dofe_rf` 传递，响应体不含 refresh。
 */
@Controller()
export class AuthApiController {
  constructor(private readonly authApi: AuthApiService) {}

  private get isProd(): boolean {
    return environmentUtil.isProduction();
  }

  /** 包装登录类响应：写 refresh cookie，响应体去掉 refresh 字段。 */
  private respondLogin(
    reply: FastifyReply,
    result: LoginSuccess,
  ): { status: 200; body: { code: number; msg: string; data: LoginSuccess } } {
    if (result.refresh) setRefreshCookie(reply, result.refresh, this.isProd);
    const { refresh: _refresh, ...data } = result;
    return { status: 200, body: { code: 200, msg: 'ok', data } };
  }

  private ok<T>(data: T): { status: 200; body: { code: number; msg: string; data: T } } {
    return { status: 200, body: { code: 200, msg: 'ok', data } };
  }

  private extractAccess(req: AuthenticatedRequest): string | undefined {
    const h = req.headers['authorization'] as string | undefined;
    return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
  }

  // ── public: 登录 / 注册 ─────────────────────────────────────────────

  @Public()
  @TsRestHandler(authContract.loginByEmail)
  async loginByEmail(@Res({ passthrough: true }) reply: FastifyReply) {
    return tsRestHandler(authContract.loginByEmail, async ({ body }) =>
      this.respondLogin(reply, await this.authApi.loginByEmail(body)),
    );
  }

  @Public()
  @TsRestHandler(authContract.loginByMobile)
  async loginByMobile(@Res({ passthrough: true }) reply: FastifyReply) {
    return tsRestHandler(authContract.loginByMobile, async ({ body }) =>
      this.respondLogin(reply, await this.authApi.loginByMobile(body)),
    );
  }

  @Public()
  @TsRestHandler(authContract.loginBySms)
  async loginBySms(@Res({ passthrough: true }) reply: FastifyReply) {
    return tsRestHandler(authContract.loginBySms, async ({ body }) =>
      this.respondLogin(reply, await this.authApi.loginBySms(body)),
    );
  }

  @Public()
  @TsRestHandler(authContract.registerByEmail)
  async registerByEmail(@Res({ passthrough: true }) reply: FastifyReply) {
    return tsRestHandler(authContract.registerByEmail, async ({ body }) =>
      this.respondLogin(reply, await this.authApi.registerByEmail(body)),
    );
  }

  @Public()
  @TsRestHandler(authContract.registerByMobile)
  async registerByMobile(@Res({ passthrough: true }) reply: FastifyReply) {
    return tsRestHandler(authContract.registerByMobile, async ({ body }) =>
      this.respondLogin(reply, await this.authApi.registerByMobile(body)),
    );
  }

  // ── public: refresh / verifyToken ───────────────────────────────────

  @Public()
  @TsRestHandler(authContract.refreshToken)
  async refreshToken(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return tsRestHandler(authContract.refreshToken, async ({ body }) => {
      const refreshToken = body.refreshToken || readRefreshCookie(req);
      if (!refreshToken) throw apiError(CommonErrorCode.UnAuthorized);
      return this.respondLogin(reply, await this.authApi.refreshToken(refreshToken));
    });
  }

  @Public()
  @TsRestHandler(authContract.verifyToken)
  async verifyToken(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(authContract.verifyToken, async () =>
      this.ok(await this.authApi.verifyToken(this.extractAccess(req))),
    );
  }

  // ── public: 验证码 ──────────────────────────────────────────────────

  @Public()
  @TsRestHandler(authContract.sendSmsCode)
  async sendSmsCode() {
    return tsRestHandler(authContract.sendSmsCode, async ({ body }) => {
      await this.authApi.sendSmsCode(body);
      return this.ok({ success: true });
    });
  }

  @Public()
  @TsRestHandler(authContract.sendEmailCode)
  async sendEmailCode() {
    return tsRestHandler(authContract.sendEmailCode, async ({ body }) => {
      await this.authApi.sendEmailCode(body);
      return this.ok({ success: true });
    });
  }

  @Public()
  @TsRestHandler(authContract.resetPassword)
  async resetPassword() {
    return tsRestHandler(authContract.resetPassword, async ({ body }) => {
      await this.authApi.resetPassword(body);
      return this.ok({ success: true });
    });
  }

  // ── 需登录 ──────────────────────────────────────────────────────────

  @TsRestHandler(authContract.logout)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return tsRestHandler(authContract.logout, async () => {
      await this.authApi.logout(this.extractAccess(req));
      clearRefreshCookie(reply, this.isProd);
      return this.ok({ success: true });
    });
  }

  @TsRestHandler(authContract.changePassword)
  async changePassword(@Req() req: AuthenticatedRequest) {
    return tsRestHandler(authContract.changePassword, async ({ body }) => {
      await this.authApi.changePassword(req.userId, body);
      return this.ok({ success: true });
    });
  }

  @TsRestHandler(authContract.verifyEmail)
  async verifyEmail() {
    return tsRestHandler(authContract.verifyEmail, async ({ body }) => {
      await this.authApi.verifyEmail(body);
      return this.ok({ success: true });
    });
  }

  @TsRestHandler(authContract.verifyMobile)
  async verifyMobile() {
    return tsRestHandler(authContract.verifyMobile, async ({ body }) => {
      await this.authApi.verifyMobile(body);
      return this.ok({ success: true });
    });
  }
}
