import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@dofe/infra-redis';
import { apiError } from '@dofe/infra-common';
import { FileClient } from '@dofe/file-sdk';
import type { FastifyRequest } from 'fastify';
import type { UserInfo } from '@prisma/client';
import type { LoginSuccess } from '@repo/contracts';
import { CommonErrorCode, UserErrorCode } from '@repo/contracts/errors';
import { TOKEN_BLACKLIST_PREFIX } from '@repo/constants';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { EmailAuthService, MobileAuthService, UserInfoService } from '@app/db';
import { PASSWORD_METHOD, hashPassword, verifyPassword } from './password.util';

/**
 * Redis 会话键（与 `config.local.yaml` 的 `redis` 段保持一致）。
 * - access:  存 `userId`，TTL = access TTL；登出时删除并写入 jti 黑名单。
 * - refresh: 存 `userId`，TTL = 30 天；refresh 轮换时消费旧值。
 */
const ACCESS_KEY = 'dofe:session:access:';
const REFRESH_KEY = 'dofe:session:refresh:';
const VERIFICATION_CODE_KEY = 'auth:code:';

/** 默认 TTL（秒）；优先取 ConfigService 中的值 */
const ACCESS_TTL_DEFAULT = 3600;
const REFRESH_TTL = 2592000;
const CODE_TTL = 600;

interface JwtPayload {
  sub: string;
  jti: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly userInfoService: UserInfoService,
    private readonly emailAuthService: EmailAuthService,
    private readonly mobileAuthService: MobileAuthService,
    private readonly fileClient: FileClient,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private get jwtSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  private get accessExpireIn(): number {
    const raw = this.config.get<string>('JWT_EXPIRE_IN');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : ACCESS_TTL_DEFAULT;
  }

  // ── Token / Session ────────────────────────────────────────────────

  async generateTokenPair(user: UserInfo): Promise<LoginSuccess> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const accessExpireIn = this.accessExpireIn;

    const [access, refresh] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, jti: accessJti, type: 'access' },
        { secret: this.jwtSecret, expiresIn: accessExpireIn },
      ),
      this.jwtService.signAsync(
        { sub: user.id, jti: refreshJti, type: 'refresh' },
        { secret: this.jwtSecret, expiresIn: REFRESH_TTL },
      ),
    ]);

    await Promise.all([
      this.redis.set(`${ACCESS_KEY}${accessJti}`, user.id, { EX: accessExpireIn }),
      this.redis.set(`${REFRESH_KEY}${refreshJti}`, user.id, { EX: REFRESH_TTL }),
    ]);

    await this.touchLastSignIn(user.id).catch((err) =>
      this.logger.warn('update lastSignInAt failed', { error: err instanceof Error ? err.message : String(err) }),
    );

    return {
      access,
      refresh,
      expire: REFRESH_TTL,
      accessExpire: accessExpireIn,
      user: this.mapUser(user),
    };
  }

  /** AuthGuard 调用：本地验证 access token + Redis 会话存活。 */
  async verifyAccessToken(token: string): Promise<{ userId: string; jti: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret: this.jwtSecret });
    } catch {
      throw apiError(CommonErrorCode.UnAuthorized);
    }
    if (payload.type !== 'access' || !payload.sub || !payload.jti) {
      throw apiError(CommonErrorCode.UnAuthorized);
    }
    const userId = await this.redis.get(`${ACCESS_KEY}${payload.jti}`);
    if (!userId) {
      // 会话已登出或过期
      throw apiError(CommonErrorCode.UnAuthorized);
    }
    return { userId: payload.sub, jti: payload.jti };
  }

  async refreshSession(refreshToken: string): Promise<LoginSuccess> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, { secret: this.jwtSecret });
    } catch {
      throw apiError(CommonErrorCode.UnAuthorized);
    }
    if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
      throw apiError(CommonErrorCode.UnAuthorized);
    }
    const userId = await this.redis.get(`${REFRESH_KEY}${payload.jti}`);
    if (!userId) {
      // refresh 已被轮换或登出；重放可能意味着被盗
      throw apiError(CommonErrorCode.SessionExpired);
    }
    // 轮换：消费旧 refresh，再签发新对
    await this.redis.del(`${REFRESH_KEY}${payload.jti}`);
    const user = await this.userInfoService.get({ id: userId });
    if (!user || !user.isActive) {
      throw apiError(CommonErrorCode.UnAuthorized);
    }
    return this.generateTokenPair(user);
  }

  async logout(jti: string): Promise<void> {
    await Promise.all([
      this.redis.del(`${ACCESS_KEY}${jti}`),
      this.redis.set(`${TOKEN_BLACKLIST_PREFIX}${jti}`, '1', { EX: ACCESS_TTL_DEFAULT }),
    ]);
  }

  /** 从 access token 解析 jti 后登出（auth-api logout 端点使用）。 */
  async logoutByToken(accessToken: string | undefined): Promise<void> {
    if (!accessToken) return;
    try {
      const decoded = this.jwtService.decode(accessToken, { complete: false }) as
        | { jti?: string }
        | null;
      if (decoded?.jti) await this.logout(decoded.jti);
    } catch (error) {
      this.logger.warn('logoutByToken failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ── 登录 ────────────────────────────────────────────────────────────

  async loginByEmail(email: string, password: string): Promise<LoginSuccess> {
    const auth = await this.emailAuthService.get({ email });
    if (!auth) throw apiError(UserErrorCode.UserNotFound);
    if (!(await verifyPassword(password, auth.password))) {
      throw apiError(UserErrorCode.InvalidPassword);
    }
    return this.finishLogin(auth.userId);
  }

  async loginByMobile(mobile: string, password: string): Promise<LoginSuccess> {
    const auth = await this.mobileAuthService.get({ mobile });
    if (!auth) throw apiError(UserErrorCode.UserNotFound);
    if (!(await verifyPassword(password, auth.password))) {
      throw apiError(UserErrorCode.InvalidPassword);
    }
    return this.finishLogin(auth.userId);
  }

  async loginBySms(mobile: string, code: string): Promise<LoginSuccess> {
    await this.consumeCode('login', mobile, code);
    const auth = await this.mobileAuthService.get({ mobile });
    if (!auth) throw apiError(UserErrorCode.UserNotFound);
    return this.finishLogin(auth.userId);
  }

  private async finishLogin(userId: string): Promise<LoginSuccess> {
    const user = await this.userInfoService.get({ id: userId });
    if (!user || !user.isActive) throw apiError(CommonErrorCode.UnAuthorized);
    return this.generateTokenPair(user);
  }

  // ── 注册 ────────────────────────────────────────────────────────────

  async registerByEmail(email: string, password: string, nickname?: string): Promise<LoginSuccess> {
    const exists = await this.emailAuthService.get({ email });
    if (exists) throw apiError(UserErrorCode.UserAlreadyExists);
    const user = await this.userInfoService.create({
      email,
      nickname: nickname?.trim() || 'User',
    });
    await this.emailAuthService.create({
      email,
      password: await hashPassword(password),
      passwordEncryptionMethod: PASSWORD_METHOD,
      user: { connect: { id: user.id } },
    });
    return this.generateTokenPair(user);
  }

  async registerByMobile(
    mobile: string,
    password: string | undefined,
    nickname?: string,
  ): Promise<LoginSuccess> {
    const exists = await this.mobileAuthService.get({ mobile });
    if (exists) throw apiError(UserErrorCode.UserAlreadyExists);
    const user = await this.userInfoService.create({
      mobile,
      nickname: nickname?.trim() || 'User',
    });
    await this.mobileAuthService.create({
      mobile,
      // 未设密码时生成随机占位，确保该账号只能通过验证码登录
      password: await hashPassword(password ?? randomUUID()),
      passwordEncryptionMethod: PASSWORD_METHOD,
      user: { connect: { id: user.id } },
    });
    return this.generateTokenPair(user);
  }

  // ── 改密 / 重置 ─────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const emailAuth = await this.emailAuthService.getByUserId(userId);
    if (emailAuth) {
      if (!(await verifyPassword(oldPassword, emailAuth.password))) {
        throw apiError(UserErrorCode.InvalidPassword);
      }
      await this.emailAuthService.update(
        { email: emailAuth.email },
        { password: await hashPassword(newPassword), passwordEncryptionMethod: PASSWORD_METHOD },
      );
      return;
    }
    const mobileAuth = await this.mobileAuthService.getByUserId(userId);
    if (mobileAuth) {
      if (!(await verifyPassword(oldPassword, mobileAuth.password))) {
        throw apiError(UserErrorCode.InvalidPassword);
      }
      await this.mobileAuthService.update(
        { mobile: mobileAuth.mobile },
        { password: await hashPassword(newPassword), passwordEncryptionMethod: PASSWORD_METHOD },
      );
      return;
    }
    throw apiError(UserErrorCode.UserNotFound);
  }

  async resetPassword(params: {
    email?: string;
    mobile?: string;
    code: string;
    newPassword: string;
  }): Promise<void> {
    const { email, mobile, code, newPassword } = params;
    const identifier = email ?? mobile;
    if (!identifier) throw apiError(CommonErrorCode.BadRequest);
    await this.consumeCode('reset_password', identifier, code);
    const hash = await hashPassword(newPassword);
    if (email) {
      const auth = await this.emailAuthService.get({ email });
      if (!auth) throw apiError(UserErrorCode.UserNotFound);
      await this.emailAuthService.update(
        { email },
        { password: hash, passwordEncryptionMethod: PASSWORD_METHOD },
      );
    } else if (mobile) {
      const auth = await this.mobileAuthService.get({ mobile });
      if (!auth) throw apiError(UserErrorCode.UserNotFound);
      await this.mobileAuthService.update(
        { mobile },
        { password: hash, passwordEncryptionMethod: PASSWORD_METHOD },
      );
    }
  }

  // ── 验证码（Redis 自管；开发期 logger 输出，生产可切换 SmsService/EmailService）──

  async sendSmsCode(mobile: string, purpose: string): Promise<void> {
    await this.issueCode(purpose, mobile);
    // TODO(prod): 接入 @dofe/infra-shared-services SmsService 真实下发
  }

  async sendEmailCode(email: string, purpose: string): Promise<void> {
    await this.issueCode(purpose, email);
    // TODO(prod): 接入 @dofe/infra-shared-services EmailService 真实下发
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    await this.consumeCode('verify', email, code);
    const auth = await this.emailAuthService.get({ email });
    if (!auth) throw apiError(UserErrorCode.UserNotFound);
    await this.emailAuthService.update({ email }, { verified: true });
  }

  async verifyMobile(mobile: string, code: string): Promise<void> {
    await this.consumeCode('verify', mobile, code);
    const auth = await this.mobileAuthService.get({ mobile });
    if (!auth) throw apiError(UserErrorCode.UserNotFound);
    await this.mobileAuthService.update({ mobile }, { verified: true });
  }

  private async issueCode(purpose: string, identifier: string): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.redis.set(`${VERIFICATION_CODE_KEY}${purpose}:${identifier}`, code, {
      EX: CODE_TTL,
    });
    this.logger.info('Verification code issued (dev mode, no real transport)', {
      purpose,
      identifier,
      code,
    });
    return code;
  }

  private async consumeCode(purpose: string, identifier: string, code: string): Promise<void> {
    const stored = await this.redis.get(`${VERIFICATION_CODE_KEY}${purpose}:${identifier}`);
    if (!stored || stored !== code) {
      throw apiError(CommonErrorCode.BadRequest, { message: 'Invalid verification code' });
    }
    await this.redis.del(`${VERIFICATION_CODE_KEY}${purpose}:${identifier}`);
  }

  // ── 复用工具（AuthGuard / 其他模块） ────────────────────────────────

  extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const header = request.headers['authorization'] as string | undefined;
    if (!header) return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  async getAvatarUrl(avatarFileId: string): Promise<string | undefined> {
    try {
      const cdnUrl = await this.fileClient.getCdnUrl(avatarFileId);
      if (cdnUrl) return cdnUrl;
    } catch (error) {
      this.logger.debug('File SDK CDN resolve failed', {
        avatarFileId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return undefined;
  }

  async formatLoginResponse(user: Partial<UserInfo>): Promise<{ user: LoginSuccess['user'] }> {
    const headerImg = user.avatarFileId ? await this.getAvatarUrl(user.avatarFileId) : undefined;
    return { user: this.mapUser(user as UserInfo, headerImg) };
  }

  // ── helpers ──────────────────────────────────────────────────────────

  private mapUser(user: UserInfo, headerImg?: string): LoginSuccess['user'] {
    return {
      id: user.id,
      isAnonymity: false,
      isAdmin: user.isAdmin ?? false,
      code: user.code ?? null,
      nickname: user.nickname || null,
      headerImg: headerImg ?? null,
      sex: user.sex ?? null,
      mobile: user.mobile ?? null,
      email: user.email ?? null,
    };
  }

  private async touchLastSignIn(userId: string): Promise<void> {
    await this.userInfoService.update({ id: userId }, { lastSignInAt: new Date() });
  }
}
