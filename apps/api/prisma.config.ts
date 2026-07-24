/**
 * Prisma 7.x Configuration File
 *
 * This file is used by Prisma CLI commands (migrate, db push, etc.)
 * For PrismaClient initialization, the URL is passed via the driver adapter
 * in PrismaWriteService and PrismaReadService.
 *
 * 注意: 生成器配置（如 output 路径）需要在 schema.prisma 中配置，
 * 不在此文件中配置。
 *
 * @see https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
 */

import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import { defineConfig, env } from 'prisma/config';

// 使用 dotenv-expand 展开环境变量（如 ${BASE_HOST}）
dotenvExpand.expand(dotenv.config());

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
