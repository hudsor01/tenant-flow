import { Global, Module } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthModule } from './auth/auth.module'
import { CurrentUserProvider } from './providers/current-user.provider'
import { StripeClientService } from './stripe-client.service'
import { ServicesModule } from './services/services.module'

/**
 * Shared Module - Ultra-Native 2025 Architecture
 * Provides minimal shared utilities across the backend application
 *
 * Contains:
 * - Reflector: NestJS metadata reflection service
 * - AuthModule: Authentication via Supabase
 * - CurrentUserProvider: Request-scoped user injection (native NestJS pattern)
 * - StripeClientService: Centralized Stripe client (singleton pattern)
 *
 * All abstractions removed per NO ABSTRACTIONS rule:
 * - No custom pipes (use built-in ParseUUIDPipe, ParseIntPipe, etc.)
 * - No custom email services (use Supabase email templates directly)
 * - No custom caching services (use native NestJS cache module)
 * - No custom security services (use native guards and built-in validation)
 * - Auth handled directly by Supabase validation
 * - User extraction via request-scoped provider (official NestJS pattern)
 */
@Global()
@Module({
	imports: [AuthModule, ServicesModule],
	providers: [Reflector, CurrentUserProvider, StripeClientService],
	exports: [Reflector, AuthModule, ServicesModule, CurrentUserProvider, StripeClientService]
})
export class SharedModule {}
