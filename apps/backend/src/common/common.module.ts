import { Module } from '@nestjs/common'
import { ErrorHandlerModule } from './errors/error-handler.module'
import { LoggingModule } from './logging/logging.module'
import { SecurityModule } from './security/security.module'

/**
 * Common module that provides shared services and utilities
 * across the entire backend application
 */
@Module({
  imports: [
    ErrorHandlerModule,
    LoggingModule,
    SecurityModule
  ],
  exports: [
    ErrorHandlerModule,
    LoggingModule,
    SecurityModule
  ]
})
export class CommonModule {}