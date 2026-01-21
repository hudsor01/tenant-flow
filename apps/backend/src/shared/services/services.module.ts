/**
 * Shared Services Module
 *
 * Provides utility services that replace database functions
 * These services are available globally across the application
 */

import { Global, Module } from '@nestjs/common'
import { UtilityService } from './utility.service'
import { SearchService } from './search.service'
import { PasswordService } from './password.service'
import { AuthRequestCache } from './auth-request-cache.service'
import { EventIdempotencyService } from './event-idempotency.service'

@Global()
@Module({
	imports: [],
	controllers: [],
	providers: [
		UtilityService,
		SearchService,
		PasswordService,
		AuthRequestCache,
		EventIdempotencyService
	],
	exports: [
		UtilityService,
		SearchService,
		PasswordService,
		AuthRequestCache,
		EventIdempotencyService
	]
})
export class ServicesModule {}
