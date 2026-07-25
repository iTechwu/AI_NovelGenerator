import { z } from 'zod';

/**
 * 本地账号密码认证（自建认证）请求/响应 Schema。
 *
 * hanlin.ai 不再委托 sso.dofe.ai 做认证：邮箱/手机号注册登录、密码重置、
 * 验证码发送等均由本地 auth-api 模块处理。登录成功响应复用 `LoginSuccessSchema`
 * （定义在 `sign.schema.ts`）。
 */

// ============================================================================
// Request Schemas
// ============================================================================

export const EmailLoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});
export type EmailLoginBody = z.infer<typeof EmailLoginBodySchema>;

export const MobileLoginBodySchema = z.object({
  mobile: z.string().min(1),
  password: z.string().min(6).max(128),
});
export type MobileLoginBody = z.infer<typeof MobileLoginBodySchema>;

export const SmsLoginBodySchema = z.object({
  mobile: z.string().min(1),
  code: z.string().length(6),
});
export type SmsLoginBody = z.infer<typeof SmsLoginBodySchema>;

export const EmailRegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  nickname: z.string().min(1).max(50).optional(),
  verifyCode: z.string().optional(),
  captchaToken: z.string().optional(),
});
export type EmailRegisterBody = z.infer<typeof EmailRegisterBodySchema>;

export const MobileRegisterBodySchema = z.object({
  mobile: z.string().min(1),
  code: z.string().length(6),
  password: z.string().min(8).max(128).optional(),
  nickname: z.string().min(1).max(50).optional(),
  captchaToken: z.string().optional(),
});
export type MobileRegisterBody = z.infer<typeof MobileRegisterBodySchema>;

/**
 * refresh_token 优先从 HttpOnly cookie（dofe_rf）读取；
 * body 字段保留为可选以兼容显式传入的场景。
 */
export const RefreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshTokenBody = z.infer<typeof RefreshTokenBodySchema>;

export const SendSmsBodySchema = z.object({
  mobile: z.string().min(1),
  purpose: z.enum(['login', 'register', 'reset_password']),
  captchaToken: z.string().optional(),
});
export type SendSmsBody = z.infer<typeof SendSmsBodySchema>;

export const SendEmailBodySchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['verify', 'reset_password']),
  captchaToken: z.string().optional(),
});
export type SendEmailBody = z.infer<typeof SendEmailBodySchema>;

export const ChangePasswordBodySchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>;

export const VerifyEmailBodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});
export type VerifyEmailBody = z.infer<typeof VerifyEmailBodySchema>;

export const VerifyMobileBodySchema = z.object({
  mobile: z.string().min(1),
  code: z.string().length(6),
});
export type VerifyMobileBody = z.infer<typeof VerifyMobileBodySchema>;

export const ResetPasswordBodySchema = z
  .object({
    email: z.string().email().optional(),
    mobile: z.string().min(1).optional(),
    code: z.string().length(6),
    newPassword: z.string().min(8).max(128),
    captchaToken: z.string().optional(),
  })
  .refine((data) => data.email || data.mobile, {
    message: 'Either email or mobile must be provided',
  });
export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const TokenVerifyResponseSchema = z.object({
  valid: z.boolean(),
  userId: z.string().optional(),
  expiresAt: z.number().optional(),
});
export type TokenVerifyResponse = z.infer<typeof TokenVerifyResponseSchema>;
