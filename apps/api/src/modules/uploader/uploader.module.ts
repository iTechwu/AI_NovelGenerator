import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  FileCdnModule,
  FileStorageServiceModule,
  UploaderModule as UploaderServiceModule,
} from '@dofe/infra-shared-services';
import { FileSourceModule } from '@app/db';
import { FileDomainModule } from '@app/services/file';
import { UploaderController } from './uploader.controller';
import { UploaderService } from './uploader.service';

@Module({
  imports: [
    ConfigModule,
    UploaderServiceModule,
    FileStorageServiceModule,
    FileCdnModule,
    FileSourceModule,
    FileDomainModule,
  ],
  controllers: [UploaderController],
  providers: [UploaderService],
  exports: [UploaderService],
})
export class UploaderApiModule {}
