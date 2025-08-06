import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	Logger
} from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(ErrorLoggingInterceptor.name)

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest()
		const { method, url, body, user } = request

		return next.handle().pipe(
			catchError((error) => {
				this.logger.error(
					`Error occurred in ${method} ${url}`,
					{
						error: error.message,
						stack: error.stack,
						statusCode: error.status,
						user: user?.id,
						body: JSON.stringify(body)
					}
				)
				return throwError(() => error)
			})
		)
	}
}