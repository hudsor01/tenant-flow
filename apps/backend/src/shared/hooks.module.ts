import { Global, Module } from '@nestjs/common'
import { 
	ErrorResponseHooksService,
	HooksIntegrationService,
	RequestContextHooksService,
	RequestContextService,
	RouteScopedHooksService,
	UnifiedFastifyHooksService
} from './services'

/**
 * Hooks Module
 * 
 * Provides all Fastify hooks services as a global module.
 * This module should be imported in AppModule to make
 * hook services available throughout the application.
 */
@Global()
@Module({
	providers: [
		RequestContextService,
		RequestContextHooksService,
		UnifiedFastifyHooksService,
		RouteScopedHooksService,
		ErrorResponseHooksService,
		HooksIntegrationService
	],
	exports: [
		RequestContextService,
		RequestContextHooksService,
		UnifiedFastifyHooksService,
		RouteScopedHooksService,
		ErrorResponseHooksService,
		HooksIntegrationService
	]
})
export class HooksModule {}