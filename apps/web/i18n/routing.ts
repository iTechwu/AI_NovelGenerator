/**
 * i18n 路由配置
 * 定义多语言路由规则
 */

import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  // 支持的语言列表
  locales,

  // 默认语言
  defaultLocale,

  // Keep locale-prefixed routes stable for the HTTPS development entrypoint.
  localePrefix: 'always',
});
