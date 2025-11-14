import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
	Logger
} from '@nestjs/common'
import { BUSINESS_ERROR_CODES, API_ERROR_CODES, ERROR_TYPES } from '@repo/shared/constants/error-codes'
import { Request, Response } from 'express'

type ExceptionResponse = {
	message?: string | string[]
	error?: string
	code?: string
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
		let code: string | undefined

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
				const rawMessage = responseObj.message
				// Extract error code if present
				if (responseObj.code) {
					code = responseObj.code
				}
				// Handle array messages (e.g., from class-validator)
				if (Array.isArray(rawMessage)) {
					message = rawMessage.join('; ')
				} else {
					message = rawMessage || message
				}
			}
		}

		const sanitizedPath = this.sanitizeRequestPath(request)

		// Log exception for production observability
		const timestamp = new Date().toISOString()
		const errorContext = {
			status,
			message,
			path: sanitizedPath,
			method: request.method,
			timestamp
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
			timestamp,
			path: sanitizedPath, // Use sanitized path without query params
			...(code && this.isValidErrorCode(code) && { code }) // Include error code if present and valid
		}

		// Only include stack trace in development
		if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
			errorResponse.stack = exception.stack
		}

		response.status(status).json(errorResponse)
	}

	/**
	 * Sanitizes request URL by extracting only the pathname
	 * SECURITY: Removes sensitive query parameters from logs
	 */
	private sanitizeRequestPath(request: Request): string {
		try {
			if (request.url) {
				// Parse URL safely - handle relative URLs by adding a base
				const url = new URL(
					request.url,
					`http://${request.headers?.host || 'localhost'}`
				)
				return url.pathname
			} else if (request.path) {
				return request.path
			}
		} catch {
			// If URL parsing fails, fall back to a safe default
			return request.path || '/'
		}
		return '/'
	}

	/**
	 * Validates that an error code is from the approved constants
	 * SECURITY: Prevents malicious error code injection
	 */
	private isValidErrorCode(code: string): boolean {
		const allValidCodes = new Set([
			...Object.values(BUSINESS_ERROR_CODES),
			...Object.values(API_ERROR_CODES),
			...Object.values(ERROR_TYPES)
		] as string[])
		return allValidCodes.has(code)
	}
}
