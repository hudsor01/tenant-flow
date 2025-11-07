import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
	Logger
} from '@nestjs/common'
import { Request, Response } from 'express'

type ExceptionResponse = {
	message?: string
	error?: string
	[key: string]: unknown
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name)

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const request = ctx.getRequest<Request>()

		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message = 'Internal server error'

		if (exception instanceof HttpException) {
			status = exception.getStatus()
			const exceptionResponse = exception.getResponse()
			if (typeof exceptionResponse === 'string') {
				message = exceptionResponse
			} else if (
				typeof exceptionResponse === 'object' &&
				exceptionResponse !== null &&
				'message' in exceptionResponse
			) {
				const responseObj = exceptionResponse as ExceptionResponse
				message = responseObj.message || message
			}
		}

		// SECURITY: Sanitize URL to remove sensitive query parameters
		// Extract only the pathname, never log full URL with query params
		let sanitizedPath = '/'
		try {
			if (request.url) {
				// Parse URL safely - handle relative URLs by adding a base
				const url = new URL(
					request.url,
					`http://${(request as Request).headers?.host || 'localhost'}`
				)
				sanitizedPath = url.pathname
			} else if ((request as Request).path) {
				sanitizedPath = (request as Request).path
			}
		} catch {
			// If URL parsing fails, fall back to a safe default
			sanitizedPath = (request as Request).path || '/'
		}

		// Log exception for production observability
		const errorContext = {
			status,
			message,
			path: sanitizedPath,
			method: request.method,
			timestamp: new Date().toISOString()
		}

		// Include stack trace in error log if available
		if (exception instanceof Error) {
			this.logger.error(`Exception caught: ${message}`, {
				...errorContext,
				stack: exception.stack
			})
		} else {
			this.logger.error(`Exception caught: ${message}`, errorContext)
		}

		// Sanitize error response - only include safe fields
		const errorResponse: Record<string, unknown> = {
			success: false,
			message,
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: sanitizedPath // Use sanitized path without query params
		}

		// Only include stack trace in development
		if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
			errorResponse.stack = exception.stack
		}

		response.status(status).json(errorResponse)
	}
}
