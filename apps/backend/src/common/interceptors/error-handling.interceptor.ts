import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	HttpException,
	HttpStatus,
	Logger
} from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import type { 
	ErrorResponse, 
	ValidationErrorResponse, 
	NotFoundErrorResponse,
	UnauthorizedErrorResponse,
	InternalServerErrorResponse
} from '../dto/error-response.dto'

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(ErrorHandlingInterceptor.name)


	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest()
		const contextInfo = {
			method: request.method,
			url: request.url,
			userId: request.user?.id
		}

		return next.handle().pipe(
			catchError((error) => {
				const timestamp = new Date().toISOString()
				const path = request.url

				// If it's already an HttpException with structured response, let it pass through
				if (error instanceof HttpException) {
					const response = error.getResponse() as Record<string, unknown>
					
					// If it's already a structured error response, pass through
					if (typeof response === 'object' && response.error) {
						this.logger.warn(`Structured HTTP Exception: ${error.message}`, {
							status: error.getStatus(),
							...contextInfo
						})
						return throwError(() => error)
					}

					// Transform simple HttpException to structured response
					const structuredResponse = this.createStructuredErrorResponse(
						error.getStatus(),
						error.message,
						timestamp,
						path,
						contextInfo
					)

					this.logger.warn(`HTTP Exception: ${error.message}`, {
						status: error.getStatus(),
						...contextInfo
					})

					return throwError(() => new HttpException(structuredResponse, error.getStatus()))
				}

				// Log the error with context
				this.logger.error('Unhandled error in request', {
					error: error.message,
					stack: error.stack,
					...contextInfo
				})

				// Handle Prisma errors
				if (error.code === 'P2002') {
					const conflictResponse: ErrorResponse = {
						error: 'Conflict',
						statusCode: HttpStatus.CONFLICT,
						message: 'A resource with this information already exists',
						timestamp,
						path,
						resource: 'unknown',
						conflictingField: error.meta?.target?.[0]
					}
					return throwError(() => new HttpException(conflictResponse, HttpStatus.CONFLICT))
				}

				if (error.code === 'P2025') {
					const notFoundResponse: NotFoundErrorResponse = {
						error: 'Not Found',
						statusCode: HttpStatus.NOT_FOUND,
						message: 'The requested resource was not found',
						timestamp,
						path,
						resource: 'unknown'
					}
					return throwError(() => new HttpException(notFoundResponse, HttpStatus.NOT_FOUND))
				}

				// Handle validation errors
				if (error.name === 'ValidationError') {
					const validationResponse: ValidationErrorResponse = {
						error: 'Validation Error',
						statusCode: HttpStatus.BAD_REQUEST,
						message: 'Request validation failed',
						timestamp,
						path,
						details: error.errors || []
					}
					return throwError(() => new HttpException(validationResponse, HttpStatus.BAD_REQUEST))
				}

				// Default error response
				const internalErrorResponse: InternalServerErrorResponse = {
					error: 'Internal Server Error',
					statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
					message: 'An unexpected error occurred',
					timestamp,
					path,
					requestId: contextInfo.userId || 'anonymous'
				}

				return throwError(() => new HttpException(internalErrorResponse, HttpStatus.INTERNAL_SERVER_ERROR))
			})
		)
	}

	private createStructuredErrorResponse(
		statusCode: number,
		message: string,
		timestamp: string,
		path: string,
		context: { method: string; url: string; userId?: string }
	): ErrorResponse {
		const baseResponse = {
			statusCode,
			message,
			timestamp,
			path
		}

		switch (statusCode) {
			case HttpStatus.BAD_REQUEST:
				return {
					...baseResponse,
					error: 'Validation Error',
					details: []
				} as ValidationErrorResponse

			case HttpStatus.UNAUTHORIZED:
				return {
					...baseResponse,
					error: 'Unauthorized',
					reason: 'invalid_token'
				} as UnauthorizedErrorResponse

			case HttpStatus.NOT_FOUND:
				return {
					...baseResponse,
					error: 'Not Found',
					resource: 'unknown'
				} as NotFoundErrorResponse

			case HttpStatus.CONFLICT:
				return {
					...baseResponse,
					error: 'Conflict',
					resource: 'unknown'
				} as ErrorResponse

			default:
				return {
					...baseResponse,
					error: 'Internal Server Error',
					requestId: context.userId || 'anonymous'
				} as InternalServerErrorResponse
		}
	}
}