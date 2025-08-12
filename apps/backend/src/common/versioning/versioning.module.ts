import { Module } from '@nestjs/common'
import { ApiVersionInterceptor } from '../interceptors/api-version.interceptor'
import { VersioningService } from './versioning.service'
import { VersioningController } from './versioning.controller'

@Module({
  providers: [ApiVersionInterceptor, VersioningService],
  controllers: [VersioningController],
  exports: [ApiVersionInterceptor, VersioningService]
})
export class VersioningModule {}