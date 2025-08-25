import { Module } from '@nestjs/common'
import { UsageLimitsGuard } from './guards/usage-limits.guard'

/**
 * Common module that provides shared services and utilities
 * across the entire backend application
 * Note: ErrorHandlerService removed - using native NestJS exception filters
 * Note: Security services removed - handled at Fastify level
 */
@Module({
	providers: [
		UsageLimitsGuard
	],
	exports: [
		UsageLimitsGuard
	]
})
export class CommonModule {}
