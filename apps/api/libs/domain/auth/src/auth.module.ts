import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@dofe/infra-jwt';
import { RedisModule } from '@dofe/infra-redis';
import { FileClient } from '@dofe/file-sdk';
import { EmailAuthModule, MobileAuthModule, UserInfoModule } from '@app/db';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthValidationService } from './auth-validation.service';

/**
 * 本地认证模块（自建认证）。
 *
 * 不再 import `InfraSsoClientModule`：token 签发/验证与会话管理全部在本地完成。
 * `FileClient` 暂时保留（头像 CDN 解析），阶段 3 文件系统就绪后改为指向本地 file-api。
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    RedisModule,
    JwtModule,
    UserInfoModule,
    EmailAuthModule,
    MobileAuthModule,
  ],
  providers: [
    AuthGuard,
    AuthService,
    {
      provide: FileClient,
      useFactory: (config: ConfigService) =>
        new FileClient({
          baseUrl: config.get<string>('SSO_API_URL') ?? '',
          internalSecret: config.get<string>('INTERNAL_API_SECRET') ?? '',
        }),
      inject: [ConfigService],
    },
    AuthValidationService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [
    AuthGuard,
    AuthService,
    AuthValidationService,
    JwtModule,
    UserInfoModule,
    EmailAuthModule,
    MobileAuthModule,
  ],
})
export class AuthModule {}
