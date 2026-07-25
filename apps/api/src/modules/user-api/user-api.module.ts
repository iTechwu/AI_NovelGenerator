import { Module } from '@nestjs/common';
import { AuthModule } from '@app/auth';
import { UserApiController } from './user-api.controller';
import { UserApiService } from './user-api.service';

@Module({
  imports: [AuthModule],
  controllers: [UserApiController],
  providers: [UserApiService],
})
export class UserApiModule {}
