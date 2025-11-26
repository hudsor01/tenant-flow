/**
 * Auth Module - Supabase Authentication
 *
 * Simple module that provides JwtAuthGuard
 * All JWT verification is delegated to SupabaseService
 */

import { Module } from '@nestjs/common'
import { JwtAuthGuard } from './jwt-auth.guard'

@Module({
	providers: [JwtAuthGuard],
	exports: [JwtAuthGuard]
})
export class AuthModule {}
