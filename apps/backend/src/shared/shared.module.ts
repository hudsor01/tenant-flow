import { Global, Module } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UsageLimitsGuard } from './guards/usage-limits.guard'
import { AuthGuard } from './guards/auth.guard'
import { TokenValidationService } from './services/token-validation.service'
import { ResilienceService } from './services/resilience.service'
import { SecurityMonitorService } from './services/security-monitor.service'

/**
 * Shared Module - Production Security Architecture
 * Provides shared services and guards across the backend application
 *
 * Contains:
 * - TokenValidationService: Ultra-native token validation without circular dependencies
 * - AuthGuard: JWT authentication and role-based access control
 * - UsageLimitsGuard: Rate limiting and usage enforcement
 * - ResilienceService: Cache and fallback patterns for zero-downtime
 * - SecurityMonitorService: Comprehensive security monitoring and alerting
 * - Reflector: NestJS metadata reflection service for guards
 */
@Global()
@Module({
	imports: [],
	providers: [
		Reflector,
		TokenValidationService,
		UsageLimitsGuard,
		AuthGuard,
		ResilienceService,
		SecurityMonitorService
	],
	exports: [
		Reflector,
		TokenValidationService,
		UsageLimitsGuard,
		AuthGuard,
		ResilienceService,
		SecurityMonitorService
	]
})
export class SharedModule {}
