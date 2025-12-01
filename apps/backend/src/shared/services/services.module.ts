/**
 * Shared Services Module
 *
 * Provides utility services that replace database functions
 * These services are available globally across the application
 */

import { Global, Module } from '@nestjs/common'
import { UtilityService } from './utility.service'
import { AuthRequestCache } from './auth-request-cache.service'
import { EventIdempotencyService } from './event-idempotency.service'

@Global()
@Module({
	imports: [],
	providers: [UtilityService, AuthRequestCache, EventIdempotencyService],
	exports: [UtilityService, AuthRequestCache, EventIdempotencyService]
})
export class ServicesModule {}
