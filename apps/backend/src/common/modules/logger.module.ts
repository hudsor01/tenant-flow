import { Module } from '@nestjs/common'
import { LoggerService } from '../services/logger.service'
import { MetricsService } from '../services/metrics.service'
import { MetricsController } from '../controllers/metrics.controller'
import { FastifyRequestLoggerService } from '../logging/fastify-request-logger.service'

/**
 * Logger Module
 *
 * Provides native NestJS logging, metrics, and auditing capabilities.
 * No longer @Global - import where needed following NestJS best practices.
 */
@Module({
	controllers: [MetricsController],
	providers: [LoggerService, MetricsService, FastifyRequestLoggerService],
	exports: [LoggerService, MetricsService, FastifyRequestLoggerService]
})
export class LoggerModule {}