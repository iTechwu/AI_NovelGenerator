import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileSourceModule } from '@app/db';
import { FileCdnModule, FileStorageServiceModule } from '@dofe/infra-shared-services';
import { FileDomainService } from './file-domain.service';

@Module({
  imports: [ConfigModule, FileSourceModule, FileStorageServiceModule, FileCdnModule],
  providers: [FileDomainService],
  exports: [FileDomainService, FileSourceModule],
})
export class FileDomainModule {}
