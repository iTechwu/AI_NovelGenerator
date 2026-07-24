import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { NovelRuntimeClient } from './novel-runtime.client';

@Module({
  imports: [HttpModule],
  providers: [NovelRuntimeClient],
  exports: [NovelRuntimeClient],
})
export class NovelRuntimeClientModule {}
