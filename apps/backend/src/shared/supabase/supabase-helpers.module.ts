import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SupabaseErrorHandler } from './supabase-error-handler'
import { SupabaseQueryHelpers } from './supabase-query-helpers'

/**
 * Global module for Supabase error handling and query helpers
 *
 * Makes error handler and query helpers available to all services
 * without explicit imports in feature modules.
 */
@Global()
@Module({
	imports: [ConfigModule],
	providers: [SupabaseErrorHandler, SupabaseQueryHelpers],
	exports: [SupabaseErrorHandler, SupabaseQueryHelpers]
})
export class SupabaseHelpersModule {}
