/**
 * Auth Module - Supabase Authentication
 *
 * Configures Passport JWT strategy for Supabase
 * Follows 2025 NestJS best practices
 */

import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { SupabaseStrategy, TokenExpirationService } from './supabase.strategy'
import { JwtAuthGuard } from './jwt-auth.guard'

@Module({
	imports: [PassportModule.register({ defaultStrategy: 'supabase' })],
	providers: [
		TokenExpirationService, // Must be before SupabaseStrategy
		SupabaseStrategy,
		JwtAuthGuard
	],
	exports: [JwtAuthGuard, PassportModule]
})
export class AuthModule {}
