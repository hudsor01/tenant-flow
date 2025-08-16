import { Global, Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ErrorHandlerService } from './error-handler.service'
import { GlobalExceptionFilter } from '../filters/global-exception.filter'
import { ErrorBoundaryGuard } from '../guards/error-boundary.guard'
import { UnifiedLoggerService } from '../logging/unified-logger.service'

@Global()
@Module({
	providers: [
		ErrorHandlerService,
		UnifiedLoggerService,
		{
			provide: APP_FILTER,
			useClass: GlobalExceptionFilter
		},
		{
			provide: APP_GUARD,
			useClass: ErrorBoundaryGuard
		}
	],
	exports: [ErrorHandlerService, UnifiedLoggerService]
})
export class ErrorModule {}
