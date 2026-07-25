import type { FastifyReply } from 'fastify';

/**
 * refresh_token cookie 工具。
 *
 * 约定：refresh_token 只放在 HttpOnly cookie `dofe_rf`，不下发到前端 JS，
 * 防 XSS 窃取。access_token 由响应体返回，前端自行保管（localStorage）。
 */
export const REFRESH_COOKIE_NAME = 'dofe_rf';
const REFRESH_COOKIE_TTL_S = 2592000; // 30 天，与 refresh token TTL 对齐

export function setRefreshCookie(
  reply: FastifyReply,
  refreshToken: string,
  isProd: boolean,
): void {
  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_TTL_S,
  });
}

export function clearRefreshCookie(reply: FastifyReply, isProd: boolean): void {
  reply.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}

export function readRefreshCookie(request: {
  cookies?: Record<string, string | undefined>;
}): string | undefined {
  return request.cookies?.[REFRESH_COOKIE_NAME];
}
