import { Module, Global } from '@nestjs/common'
import { LoggerService } from '../services/logger.service'
import { MetricsService } from '../services/metrics.service'
import { MetricsController } from '../controllers/metrics.controller'
import { FastifyRequestLoggerService } from '../logging/fastify-request-logger.service'

/**
 * Logger Module
 * 
 * Provides all logging, metrics, and auditing capabilities.
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    LoggerService,
    MetricsService,
    FastifyRequestLoggerService,
  ],
  exports: [
    LoggerService,
    MetricsService,
    FastifyRequestLoggerService,
  ],
})
export class LoggerModule {}