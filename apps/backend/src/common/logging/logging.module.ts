import { Module, Global } from '@nestjs/common'
import { AuditLogger, PerformanceLogger, createLogger } from './logger.config'
import { FastifyRequestLoggerService } from './fastify-request-logger.service'

/**
 * Logging Module
 * 
 * Makes the existing logger helpers available as injectable providers
 * throughout the application for consistent structured logging.
 * 
 * Features:
 * - AuditLogger for security and compliance logging
 * - PerformanceLogger for tracking operation timing
 * - Global availability without duplication
 */
@Global()
@Module({
  providers: [
    AuditLogger,
    FastifyRequestLoggerService,
    {
      provide: 'PerformanceLoggerFactory',
      useFactory: () => (operation: string, context?: Record<string, unknown>) => 
        new PerformanceLogger(createLogger(), operation, context),
    }
  ],
  exports: [
    AuditLogger,
    FastifyRequestLoggerService,
    'PerformanceLoggerFactory'
  ]
})
export class LoggingModule {}