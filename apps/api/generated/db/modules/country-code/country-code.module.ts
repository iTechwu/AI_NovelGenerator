import { Module } from '@nestjs/common';
import { CountryCodeService } from './country-code.service';
import { PrismaModule } from '@dofe/infra-prisma';

@Module({
  imports: [PrismaModule],
  providers: [CountryCodeService],
  exports: [CountryCodeService],
})
export class CountryCodeModule {}
