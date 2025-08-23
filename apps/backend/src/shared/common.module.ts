import { Module } from '@nestjs/common'
import { ErrorHandlerService } from '../services/error-handler.service'
import { StructuredLoggerService } from '../services/structured-logger.service'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { SimpleSecurityService } from '../security/security.service'
import { MetricsService } from '../services/metrics.service'
import { UsageLimitsGuard } from './guards/usage-limits.guard'

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
		MetricsService,
		UsageLimitsGuard
	],
	exports: [
		ErrorHandlerService,
		StructuredLoggerService,
		SecurityMonitorService,
		SimpleSecurityService,
		MetricsService,
		UsageLimitsGuard
	]
})
export class CommonModule {}
