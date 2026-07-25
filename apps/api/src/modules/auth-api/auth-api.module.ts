import { Module } from '@nestjs/common';
import { AuthModule } from '@app/auth';
import { AuthApiController } from './auth-api.controller';
import { AuthApiService } from './auth-api.service';

@Module({
  imports: [AuthModule],
  controllers: [AuthApiController],
  providers: [AuthApiService],
  exports: [AuthApiService],
})
export class AuthApiModule {}
