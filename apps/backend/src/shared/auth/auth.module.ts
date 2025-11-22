/**
 * Auth Module - Supabase Authentication
 *
 * Configures JWT verification using jose library
 * Follows 2025 NestJS best practices
 */

import { Module } from '@nestjs/common'
import { AuthUserValidationService } from './supabase.strategy'
import { JwtAuthGuard } from './jwt-auth.guard'
import { JwtVerificationService } from './jwt-verification.service'

@Module({
	// Note: ServicesModule is @Global() and imported by SharedModule,
	// so UtilityService is automatically available without explicit import
	providers: [JwtVerificationService, AuthUserValidationService, JwtAuthGuard],
	exports: [JwtAuthGuard, JwtVerificationService, AuthUserValidationService]
})
export class AuthModule {}
