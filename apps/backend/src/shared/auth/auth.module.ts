/**
 * Auth Module - Supabase Authentication
 *
 * Configures Passport JWT strategy for Supabase
 * Follows 2025 NestJS best practices
 */

import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { SupabaseStrategy } from './supabase.strategy'
import { JwtAuthGuard } from './jwt-auth.guard'
import { SharedModule } from '../shared.module'

@Module({
	imports: [
		PassportModule.register({ defaultStrategy: 'supabase' }),
		SharedModule
	],
	providers: [SupabaseStrategy, JwtAuthGuard],
	exports: [JwtAuthGuard, PassportModule]
})
export class AuthModule {}
