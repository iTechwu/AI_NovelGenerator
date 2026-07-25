import { Module } from '@nestjs/common';
import { UserMfaService } from './user-mfa.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [UserMfaService],
  exports: [UserMfaService],
})
export class UserMfaModule {}
