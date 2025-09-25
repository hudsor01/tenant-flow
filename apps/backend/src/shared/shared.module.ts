import { Global, Module } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ParseOptionalUUIDPipe } from './pipes/parse-optional-uuid.pipe'
import { EmailService } from './services/email.service'
import { ResilienceService } from './services/resilience.service'
import { SecurityMonitorService } from './services/security-monitor.service'

/**
 * Shared Module - Simplified 2025 Architecture
 * Provides shared services across the backend application
 *
 * Contains:
 * - ResilienceService: Cache and fallback patterns for zero-downtime
 * - SecurityMonitorService: Production-grade security monitoring and threat detection
 * - EmailService: Resend email service for payment and user notifications
 * - ParseOptionalUUIDPipe: Common validation pipe
 * - Reflector: NestJS metadata reflection service
 *
 * Auth is now handled directly by Supabase validation - no custom guards needed
 */
@Global()
@Module({
	imports: [],
	providers: [
		Reflector,
		ResilienceService,
		SecurityMonitorService,
		EmailService,
		ParseOptionalUUIDPipe
	],
	exports: [
		Reflector,
		ResilienceService,
		SecurityMonitorService,
		EmailService,
		ParseOptionalUUIDPipe
	]
})
export class SharedModule {}
