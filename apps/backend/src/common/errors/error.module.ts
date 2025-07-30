import { Module, Global } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core'
import { ErrorHandlerService } from './error-handler.service'
import { GlobalExceptionFilter } from '../filters/global-exception.filter'
import { ErrorLoggingInterceptor } from '../interceptors/error-logging.interceptor'
import { ErrorTransformationInterceptor } from '../interceptors/error-transformation.interceptor'
import { ErrorBoundaryGuard } from '../guards/error-boundary.guard'

@Global()
@Module({
	providers: [
		ErrorHandlerService,
		{
			provide: APP_FILTER,
			useClass: GlobalExceptionFilter
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ErrorLoggingInterceptor
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ErrorTransformationInterceptor
		},
		{
			provide: APP_GUARD,
			useClass: ErrorBoundaryGuard
		}
	],
	exports: [ErrorHandlerService]
})
export class ErrorModule {}