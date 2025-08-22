import { Module } from '@nestjs/common'
import { ErrorHandlerService } from '../services/error-handler.service'
import { StructuredLoggerService } from '../services/structured-logger.service'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { SimpleSecurityService } from '../security/security.service'
import { MetricsService } from '../services/metrics.service'

/**
 * Common module that provides shared services and utilities
 * across the entire backend application
 */
@Module({
	providers: [
		ErrorHandlerService,
		StructuredLoggerService,
		SecurityMonitorService,
		SimpleSecurityService,
		MetricsService
	],
	exports: [
		ErrorHandlerService,
		StructuredLoggerService,
		SecurityMonitorService,
		SimpleSecurityService,
		MetricsService
	]
})
export class CommonModule {}
