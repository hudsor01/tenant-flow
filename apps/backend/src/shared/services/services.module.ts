/**
 * Shared Services Module
 *
 * Provides utility services that replace database functions
 * These services are available globally across the application
 */

import { Global, Module } from '@nestjs/common'
import { UtilityService } from './utility.service'
import { AuthRequestCache } from './auth-request-cache.service'

@Global()
@Module({
	imports: [],
	providers: [UtilityService, AuthRequestCache],
	exports: [UtilityService, AuthRequestCache]
})
export class ServicesModule {}
