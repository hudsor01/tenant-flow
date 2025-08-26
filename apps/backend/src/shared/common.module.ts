import { Module } from '@nestjs/common'
<<<<<<< HEAD
=======
import { ErrorHandlerService } from '../services/error-handler.service'
import { StructuredLoggerService } from '../services/structured-logger.service'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { SimpleSecurityService } from '../security/security.service'
import { MetricsService } from '../services/metrics.service'
>>>>>>> origin/main
import { UsageLimitsGuard } from './guards/usage-limits.guard'

/**
 * Common module that provides shared services and utilities
 * across the entire backend application
<<<<<<< HEAD
 * Note: ErrorHandlerService removed - using native NestJS exception filters
 * Note: Security services removed - handled at Fastify level
 */
@Module({
	providers: [UsageLimitsGuard],
	exports: [UsageLimitsGuard]
=======
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
>>>>>>> origin/main
})
export class CommonModule {}
