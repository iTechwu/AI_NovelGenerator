import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema, SuccessResponseSchema, withVersion, API_VERSION } from '../base';
import { LoginSuccessSchema } from '../schemas/sign.schema';
import {
  EmailLoginBodySchema,
  MobileLoginBodySchema,
  SmsLoginBodySchema,
  EmailRegisterBodySchema,
  MobileRegisterBodySchema,
  RefreshTokenBodySchema,
  SendSmsBodySchema,
  SendEmailBodySchema,
  ChangePasswordBodySchema,
  VerifyEmailBodySchema,
  VerifyMobileBodySchema,
  ResetPasswordBodySchema,
  TokenVerifyResponseSchema,
} from '../schemas/auth.schema';

const c = initContract();

/**
 * 本地账号密码认证 Contract（自建认证，不依赖 sso.dofe.ai）。
 *
 * 所有路径前缀 `/auth`。登录成功统一返回 `LoginSuccessSchema`；
 * refresh_token 通过 HttpOnly cookie（dofe_rf）下发，响应体中可选。
 */
export const authContract = c.router(
  {
    loginByEmail: {
      method: 'POST',
      path: '/login/email',
      body: EmailLoginBodySchema,
      responses: { 200: ApiResponseSchema(LoginSuccessSchema) },
      summary: '邮箱密码登录',
    },

    loginByMobile: {
      method: 'POST',
      path: '/login/mobile',
      body: MobileLoginBodySchema,
      responses: { 200: ApiResponseSchema(LoginSuccessSchema) },
      summary: '手机号密码登录',
    },

    loginBySms: {
      method: 'POST',
      path: '/login/sms',
      body: SmsLoginBodySchema,
      responses: { 200: ApiResponseSchema(LoginSuccessSchema) },
      summary: '短信验证码登录',
    },

    registerByEmail: {
      method: 'POST',
      path: '/register/email',
      body: EmailRegisterBodySchema,
      responses: { 200: ApiResponseSchema(LoginSuccessSchema) },
      summary: '邮箱注册',
    },

    registerByMobile: {
      method: 'POST',
      path: '/register/mobile',
      body: MobileRegisterBodySchema,
      responses: { 200: ApiResponseSchema(LoginSuccessSchema) },
      summary: '手机号注册',
    },

    refreshToken: {
      method: 'POST',
      path: '/token/refresh',
      body: RefreshTokenBodySchema,
      responses: { 200: ApiResponseSchema(LoginSuccessSchema) },
      summary: '刷新 Token（refresh_token 优先取自 dofe_rf cookie）',
    },

    verifyToken: {
      method: 'GET',
      path: '/token/verify',
      responses: { 200: ApiResponseSchema(TokenVerifyResponseSchema) },
      summary: '验证 Token 有效性',
    },

    logout: {
      method: 'POST',
      path: '/logout',
      body: z.object({}).optional(),
      responses: { 200: ApiResponseSchema(SuccessResponseSchema) },
      summary: '登出（撤销当前会话）',
    },

    sendSmsCode: {
      method: 'POST',
      path: '/sms/send',
      body: SendSmsBodySchema,
      responses: { 200: ApiResponseSchema(SuccessResponseSchema) },
      summary: '发送短信验证码',
    },

    sendEmailCode: {
      method: 'POST',
      path: '/email/send',
      body: SendEmailBodySchema,
      responses: { 200: ApiResponseSchema(SuccessResponseSchema) },
      summary: '发送邮箱验证码',
    },

    changePassword: {
      method: 'POST',
      path: '/password/change',
      body: ChangePasswordBodySchema,
      responses: { 200: ApiResponseSchema(SuccessResponseSchema) },
      summary: '修改密码（已登录）',
    },

    verifyEmail: {
      method: 'POST',
      path: '/email/verify',
      body: VerifyEmailBodySchema,
      responses: { 200: ApiResponseSchema(SuccessResponseSchema) },
      summary: '验证邮箱',
    },

    verifyMobile: {
      method: 'POST',
      path: '/mobile/verify',
      body: VerifyMobileBodySchema,
      responses: { 200: ApiResponseSchema(SuccessResponseSchema) },
      summary: '验证手机号',
    },

    resetPassword: {
      method: 'POST',
      path: '/password/reset',
      body: ResetPasswordBodySchema,
      responses: { 200: ApiResponseSchema(SuccessResponseSchema) },
      summary: '重置密码（凭验证码）',
    },
  },
  {
    pathPrefix: '/auth',
  },
);

export const authContractVersioned = withVersion(authContract, {
  version: API_VERSION.V1,
  pathPrefix: '/auth',
});

export type AuthContract = typeof authContract;
