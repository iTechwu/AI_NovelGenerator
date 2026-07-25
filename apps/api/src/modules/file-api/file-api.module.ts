import { Module } from '@nestjs/common';
import { FileDomainModule } from '@app/services/file';
import { FileApiController } from './file-api.controller';
import { FileApiService } from './file-api.service';

@Module({
  imports: [FileDomainModule],
  controllers: [FileApiController],
  providers: [FileApiService],
})
export class FileApiModule {}
