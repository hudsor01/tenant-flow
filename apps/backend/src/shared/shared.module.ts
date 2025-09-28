import { Global, Module } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ParseOptionalUUIDPipe } from './pipes/parse-optional-uuid.pipe'
import { AuthModule } from './auth/auth.module'

/**
 * Shared Module - Ultra-Native 2025 Architecture
 * Provides minimal shared utilities across the backend application
 *
 * Contains:
 * - ParseOptionalUUIDPipe: Common validation pipe
 * - Reflector: NestJS metadata reflection service
 *
 * All abstractions removed per NO ABSTRACTIONS rule:
 * - No custom email services (use Supabase email templates directly)
 * - No custom caching services (use native NestJS cache module)
 * - No custom security services (use native guards and built-in validation)
 * - Auth handled directly by Supabase validation
 */
@Global()
@Module({
	imports: [AuthModule],
	providers: [
		Reflector,
		ParseOptionalUUIDPipe
	],
	exports: [
		Reflector,
		ParseOptionalUUIDPipe,
		AuthModule
	]
})
export class SharedModule {}
