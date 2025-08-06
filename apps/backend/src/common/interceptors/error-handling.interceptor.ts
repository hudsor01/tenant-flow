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
import { catchError, tap } from 'rxjs/operators'
import { ZodError } from 'zod'
import { PrismaClientKnownRequestError } from '@repo/database'
import * as crypto from 'crypto'
// Define local error response types to avoid dependency issues
interface BaseErrorResponse {
	error: string
	statusCode: number
	message: string
	timestamp: string
	path: string
}

interface ErrorResponse extends BaseErrorResponse {
	resource?: string
	conflictingField?: unknown
	details?: Record<string, unknown>
}

interface ValidationErrorResponse extends BaseErrorResponse {
	details: Record<string, unknown>
}

interface NotFoundErrorResponse extends BaseErrorResponse {
	resource: string
}

interface UnauthorizedErrorResponse extends BaseErrorResponse {
	reason: string
}

interface InternalServerErrorResponse extends BaseErrorResponse {
	requestId: string
}

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(ErrorHandlingInterceptor.name)


	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest()
		const { method, url, ip, headers } = request
		const userAgent = headers['user-agent'] || 'unknown'
		const userId = request.user?.id || 'anonymous'
		const startTime = Date.now()
		const requestId = request.id || this.generateRequestId()

		const contextInfo = {
			method,
			url,
			ip,
			userAgent,
			userId,
			requestId,
			timestamp: new Date().toISOString()
		}

		// Log incoming request (debug level)
		this.logger.debug(`Incoming ${method} ${url}`, contextInfo)

		return next.handle().pipe(
			tap(() => {
				// Log successful request completion
				const duration = Date.now() - startTime
				this.logger.log(
					`${method} ${url} completed successfully in ${duration}ms`,
					{ ...contextInfo, duration, status: 'success' }
				)
			}),
			catchError((error) => {
				const timestamp = new Date().toISOString()
				const path = request.url
				const duration = Date.now() - startTime

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

				// Handle Zod validation errors
				if (error instanceof ZodError) {
					const validationErrors = error.issues.map(issue => ({
						field: issue.path.join('.'),
						message: issue.message,
						code: issue.code,
						received: 'received' in issue ? issue.received : undefined
					}))

					const zodErrorResponse: ValidationErrorResponse = {
						error: 'Validation Error',
						statusCode: HttpStatus.BAD_REQUEST,
						message: 'Input validation failed',
						timestamp,
						path,
						details: { errors: validationErrors }
					}

					this.logger.warn('Zod validation error', {
						errors: validationErrors,
						...contextInfo
					})

					return throwError(() => new HttpException(zodErrorResponse, HttpStatus.BAD_REQUEST))
				}

				// Log comprehensive error details for all non-HTTP errors
				this.logger.error(
					`${method} ${url} failed after ${duration}ms: ${error.message || 'Unknown error'}`,
					{
						...contextInfo,
						duration,
						error: {
							name: error.constructor?.name || 'UnknownError',
							message: error.message || 'No message',
							stack: error.stack,
							code: error.code || 'UNKNOWN',
							statusCode: error.status || error.statusCode || 500
						}
					}
				)

				// Handle Prisma errors (including from error-transformation logic)
				if (error instanceof PrismaClientKnownRequestError || error.code?.startsWith('P')) {
					const prismaResponse = this.handlePrismaError(error, timestamp, path, contextInfo)
					
					// Log comprehensive error details
					this.logger.error(
						`${method} ${url} failed after ${duration}ms: Prisma ${error.code}`,
						{
							...contextInfo,
							duration,
							error: {
								name: 'PrismaError',
								code: error.code,
								message: error.message,
								meta: error.meta,
								statusCode: prismaResponse.statusCode
							}
						}
					)
					
					return throwError(() => new HttpException(prismaResponse, prismaResponse.statusCode))
				}

				// Handle validation errors
				if (error.name === 'ValidationError') {
					const validationResponse: ValidationErrorResponse = {
						error: 'Validation Error',
						statusCode: HttpStatus.BAD_REQUEST,
						message: 'Request validation failed',
						timestamp,
						path,
						details: { errors: error.errors || [] }
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

	/**
	 * Enhanced Prisma error handling with comprehensive error codes
	 */
	private handlePrismaError(
		error: Record<string, unknown>,
		timestamp: string,
		path: string,
		context: { method: string; url: string; userId?: string }
	): ErrorResponse {
		const { code, meta, message } = error
		const isDevelopment = process.env.NODE_ENV === 'development'

		switch (code) {
			case 'P2002': {
				const target = this.getMetaTarget(meta)
				return {
					error: 'Conflict',
					statusCode: HttpStatus.CONFLICT,
					message: `Duplicate value for ${target || 'field'}`,
					timestamp,
					path,
					resource: 'database_record',
					conflictingField: target,
					...(isDevelopment && { details: { constraintField: target } })
				}
			}

			case 'P2025':
				return {
					error: 'Not Found',
					statusCode: HttpStatus.NOT_FOUND,
					message: 'The requested record was not found',
					timestamp,
					path,
					resource: 'database_record'
				}

			case 'P2003':
				return {
					error: 'Validation Error',
					statusCode: HttpStatus.BAD_REQUEST,
					message: 'Operation violates foreign key constraint',
					timestamp,
					path,
					...(isDevelopment && { details: { field: this.getMetaFieldName(meta) } })
				}

			case 'P2014':
				return {
					error: 'Validation Error',
					statusCode: HttpStatus.BAD_REQUEST,
					message: 'The provided ID is invalid',
					timestamp,
					path
				}

			case 'P1001':
				return {
					error: 'Service Unavailable',
					statusCode: HttpStatus.SERVICE_UNAVAILABLE,
					message: 'Unable to connect to the database',
					timestamp,
					path
				}

			case 'P1008':
				return {
					error: 'Request Timeout',
					statusCode: HttpStatus.REQUEST_TIMEOUT,
					message: 'Database operation timed out',
					timestamp,
					path
				}

			default:
				this.logger.error(`Unhandled Prisma error code: ${code}`, {
					code,
					message,
					meta,
					...context
				})
				
				return {
					error: 'Database Error',
					statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
					message: isDevelopment ? String(message) || 'Unknown database error' : 'A database error occurred',
					timestamp,
					path,
					...(isDevelopment && { details: { prismaCode: code, meta } })
				}
		}
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
					details: { errors: [] }
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

	/**
	 * Safely extracts target field from Prisma error meta
	 */
	private getMetaTarget(meta: unknown): string | undefined {
		if (meta && typeof meta === 'object' && 'target' in meta) {
			const target = (meta as Record<string, unknown>).target
			if (Array.isArray(target) && target.length > 0) {
				return String(target[0])
			}
			return String(target)
		}
		return undefined
	}

	/**
	 * Safely extracts field_name from Prisma error meta
	 */
	private getMetaFieldName(meta: unknown): string | undefined {
		if (meta && typeof meta === 'object' && 'field_name' in meta) {
			return String((meta as Record<string, unknown>).field_name)
		}
		return undefined
	}

	private generateRequestId(): string {
		return `req_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
	}
}