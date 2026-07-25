import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NovelRuntimeClient } from './novel-runtime.client';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [NovelRuntimeClient],
  exports: [NovelRuntimeClient],
})
export class NovelRuntimeClientModule {}
