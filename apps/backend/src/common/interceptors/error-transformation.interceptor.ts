import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	HttpException,
	HttpStatus
} from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'

@Injectable()
export class ErrorTransformationInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle().pipe(
			catchError((error) => {
				if (error instanceof HttpException) {
					return throwError(() => error)
				}

				const transformedError = new HttpException(
					{
						statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
						message: error.message || 'Internal server error',
						error: 'Internal Server Error',
						timestamp: new Date().toISOString(),
						path: context.switchToHttp().getRequest().url
					},
					HttpStatus.INTERNAL_SERVER_ERROR
				)

				return throwError(() => transformedError)
			})
		)
	}
}