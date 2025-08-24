import { Module } from '@nestjs/common'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { SimpleSecurityService } from '../security/security.service'
import { UsageLimitsGuard } from './guards/usage-limits.guard'

/**
 * Common module that provides shared services and utilities
 * across the entire backend application
 * Note: ErrorHandlerService removed - using native NestJS exception filters
 */
@Module({
	providers: [
		SecurityMonitorService,
		SimpleSecurityService,
		UsageLimitsGuard
	],
	exports: [
		SecurityMonitorService,
		SimpleSecurityService,
		UsageLimitsGuard
	]
})
export class CommonModule {}
