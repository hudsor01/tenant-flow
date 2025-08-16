import { Module } from '@nestjs/common'
import { ErrorModule } from './errors/error.module'
import { LoggingModule } from './logging/logging.module'
import { SecurityModule } from './security/security.module'

/**
 * Common module that provides shared services and utilities
 * across the entire backend application
 */
@Module({
  imports: [
    ErrorModule,
    LoggingModule,
    SecurityModule
  ],
  exports: [
    ErrorModule,
    LoggingModule,
    SecurityModule
  ]
})
export class CommonModule {}