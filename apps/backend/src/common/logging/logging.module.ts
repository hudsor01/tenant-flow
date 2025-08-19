import { Global, Module } from '@nestjs/common'
import { UnifiedLoggerService } from './logger.service'
import { FastifyRequestLoggerService } from './fastify-request-logger.service'
import { TypeSafeConfigModule } from '../config/config.module'

/**
 * Unified Logging Module
 *
 * Provides single source of truth for all logging in the application.
 * Replaces and consolidates:
 * - LoggerModule (common/modules)
 * - UnifiedLoggingModule (common/logging)
 * - StructuredLoggerService
 * - Multiple Winston configurations
 *
 * Features:
 * - Single UnifiedLoggerService for all logging needs
 * - Environment-aware Winston configuration
 * - Request logging capabilities
 * - Performance and security audit logging
 * - Global availability throughout application
 */
@Global()
@Module({
	imports: [TypeSafeConfigModule],
	providers: [
		UnifiedLoggerService,
		FastifyRequestLoggerService,
		// Factory for creating contextual loggers
		{
			provide: 'LoggerFactory',
			useFactory: (unifiedLogger: UnifiedLoggerService) => {
				return (context: string) => {
					return unifiedLogger.child(context)
				}
			},
			inject: [UnifiedLoggerService]
		}
	],
	exports: [
		UnifiedLoggerService,
		FastifyRequestLoggerService,
		'LoggerFactory'
	]
})
export class UnifiedLoggingModule {}
