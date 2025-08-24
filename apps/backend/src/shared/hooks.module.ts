import { Global, Module } from '@nestjs/common'
import { 
	RequestContextHooksService
} from './services/request-context-hooks.service'

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
		RequestContextHooksService
	],
	exports: [
		RequestContextHooksService
	]
})
export class HooksModule {}