import { Global, Logger, Module } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from './guards/auth.guard'
import { UsageLimitsGuard } from './guards/usage-limits.guard'
import { ParseOptionalUUIDPipe } from './pipes/parse-optional-uuid.pipe'
import { ResilienceService } from './services/resilience.service'
import { SecurityMonitorService } from './services/security-monitor.service'
import { TokenValidationService } from './services/token-validation.service'

/**
 * Shared Module - Production Security Architecture
 * Provides shared services and guards across the backend application
 *
 * Contains:
 * - TokenValidationService: Ultra-native token validation without circular dependencies
 * - AuthGuard: JWT authentication and role-based access control
 * - UsageLimitsGuard: Rate limiting and usage enforcement
 * - ResilienceService: Cache and fallback patterns for zero-downtime
 * - SecurityMonitorService: Production-grade security monitoring and threat detection
 * - Reflector: NestJS metadata reflection service for guards
 */
@Global()
@Module({
	imports: [],
	providers: [
		Logger,
		Reflector,
		TokenValidationService,
		UsageLimitsGuard,
		AuthGuard,
		ResilienceService,
		SecurityMonitorService,
		ParseOptionalUUIDPipe
	],
	exports: [
		Logger,
		Reflector,
		TokenValidationService,
		UsageLimitsGuard,
		AuthGuard,
		ResilienceService,
		SecurityMonitorService,
		ParseOptionalUUIDPipe
	]
})
export class SharedModule {}
