import { Module } from '@nestjs/common';
import { FileDomainModule } from '@app/services/file';
import { CdnProxyController } from './cdn-proxy.controller';

@Module({
  imports: [FileDomainModule],
  controllers: [CdnProxyController],
})
export class CdnProxyModule {}
