import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Injectable
} from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type {
	FastifyErrorResponse,
	FastifyBusinessErrorResponse,
	ErrorLogContext
} from '@repo/shared'
import { BusinessException } from '../exceptions'

// Extend FastifyRequest to include user from JWT auth
interface AuthenticatedRequest extends FastifyRequest {
	user?: {
		id: string
		email?: string
		role?: string
	}
}

/**
 * Global exception filter using ultra-fast Pino logging with request context
 * Replaces custom ErrorHandlerService with native NestJS + Pino integration
 *
 * PERFORMANCE: Uses Pino (5-10x faster than Winston/NestJS Logger)
 * CONTEXT: Automatic request context correlation via nestjs-pino
 * SECURITY: Sanitizes request bodies before logging to prevent sensitive data exposure
 * 
 * Following CLAUDE.md RULE #3: No abstractions - native platform features only
 */
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
	constructor(private readonly logger: PinoLogger) {
		// Set context for this logger instance
		// PinoLogger context handled automatically via app-level configuration
	}

	/**
	 * Sanitize request body to prevent logging sensitive data
	 * Removes passwords, tokens, and other sensitive fields
	 */
	private sanitizeRequestBody(body: unknown): unknown {
		if (!body || typeof body !== 'object' || body === null) {
			return body
		}

		// Sensitive field patterns to redact
		const sensitiveFields = [
			// Passwords
			'password',
			'currentPassword',
			'newPassword',
			'confirmPassword',
			'oldPassword',
			// Tokens and credentials
			'token',
			'refresh_token',
			'access_token',
			'api_key',
			'apiKey',
			'secret',
			'key',
			'authorization',
			// Personal identification
			'ssn',
			'social_security_number',
			'tax_id',
			'passport',
			'drivers_license',
			// Financial data
			'credit_card',
			'creditCard',
			'card_number',
			'cvv',
			'pin',
			'routing_number',
			'account_number',
			// Biometric data
			'fingerprint',
			'biometric'
		]

		try {
			const sanitized = JSON.parse(JSON.stringify(body)) as Record<string, unknown>

			const redactSensitiveFields = (
				obj: Record<string, unknown>
			): void => {
				if (obj && typeof obj === 'object') {
					for (const key in obj) {
						if (Object.prototype.hasOwnProperty.call(obj, key)) {
							const lowerKey = key.toLowerCase()

							// Check if field name contains sensitive patterns
							const isSensitive = sensitiveFields.some(pattern =>
								lowerKey.includes(pattern.toLowerCase())
							)

							if (isSensitive) {
								obj[key] = '[REDACTED]'
							} else if (
								typeof obj[key] === 'object' &&
								obj[key] !== null
							) {
								redactSensitiveFields(
									obj[key] as Record<string, unknown>
								)
							}
						}
					}
				}
			}

			redactSensitiveFields(sanitized)
			return sanitized
		} catch {
			// If sanitization fails, return safe fallback
			return { error: 'Unable to sanitize request body' }
		}
	}

	/**
	 * Create business error response for domain-specific errors
	 */
	private createBusinessErrorResponse(
		status: number,
		message: string,
		code: string,
		path: string,
		details?: Record<string, unknown>
	): FastifyBusinessErrorResponse {
		return {
			success: false,
			statusCode: status,
			message,
			error: this.getHttpStatusText(status),
			timestamp: new Date().toISOString(),
			path,
			code,
			details
		}
	}

	/**
	 * Get HTTP status text for common status codes
	 * Maps HTTP status codes to their standard text representations
	 */
	private getHttpStatusText(status: number): string {
		const statusMap: Record<number, string> = {
			// 1xx Informational
			100: 'Continue',
			101: 'Switching Protocols',
			102: 'Processing',

			// 2xx Success
			200: 'OK',
			201: 'Created',
			202: 'Accepted',
			204: 'No Content',

			// 3xx Redirection
			300: 'Multiple Choices',
			301: 'Moved Permanently',
			302: 'Found',
			304: 'Not Modified',

			// 4xx Client Errors
			400: 'Bad Request',
			401: 'Unauthorized',
			402: 'Payment Required',
			403: 'Forbidden',
			404: 'Not Found',
			405: 'Method Not Allowed',
			406: 'Not Acceptable',
			408: 'Request Timeout',
			409: 'Conflict',
			410: 'Gone',
			411: 'Length Required',
			412: 'Precondition Failed',
			413: 'Payload Too Large',
			414: 'URI Too Long',
			415: 'Unsupported Media Type',
			416: 'Range Not Satisfiable',
			417: 'Expectation Failed',
			418: "I'm a teapot",
			421: 'Misdirected Request',
			422: 'Unprocessable Entity',
			423: 'Locked',
			424: 'Failed Dependency',
			425: 'Too Early',
			426: 'Upgrade Required',
			428: 'Precondition Required',
			429: 'Too Many Requests',
			431: 'Request Header Fields Too Large',
			451: 'Unavailable For Legal Reasons',

			// 5xx Server Errors
			500: 'Internal Server Error',
			501: 'Not Implemented',
			502: 'Bad Gateway',
			503: 'Service Unavailable',
			504: 'Gateway Timeout',
			505: 'HTTP Version Not Supported',
			506: 'Variant Also Negotiates',
			507: 'Insufficient Storage',
			508: 'Loop Detected',
			510: 'Not Extended',
			511: 'Network Authentication Required'
		}

		return statusMap[status] || 'Unknown Status'
	}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<FastifyReply>()
		const request = ctx.getRequest<AuthenticatedRequest>()

		let status: number
		let message: string
		let error: string

		if (exception instanceof BusinessException) {
			// Handle business exceptions with structured error response
			const businessErrorResponse = this.createBusinessErrorResponse(
				exception.getStatus(),
				exception.message,
				exception.code,
				request.url,
				exception.details
			)

			// Use Pino structured logging with automatic request context
			this.logger.warn(
				{ 
					businessException: {
						code: exception.code,
						message: exception.message,
						details: exception.details
					},
					userId: request.user?.id 
				},
				`Business rule violation: ${exception.code}`
			)

			response.status(exception.getStatus()).send(businessErrorResponse)
			return
		} else if (exception instanceof HttpException) {
			status = exception.getStatus()
			const exceptionResponse = exception.getResponse()

			if (
				typeof exceptionResponse === 'object' &&
				exceptionResponse !== null &&
				!Array.isArray(exceptionResponse)
			) {
				const responseObj = exceptionResponse as Record<string, unknown>
				message =
					typeof responseObj.message === 'string'
						? responseObj.message
						: Array.isArray(responseObj.message)
							? responseObj.message.join(', ')
							: exception.message
				error =
					typeof responseObj.error === 'string'
						? responseObj.error
						: 'HTTP Exception'
			} else {
				message = String(exceptionResponse)
				// Get the HTTP status text for common status codes
				error = this.getHttpStatusText(status)
			}
		} else if (exception instanceof Error) {
			status = HttpStatus.INTERNAL_SERVER_ERROR
			message = 'Internal server error'

			// CRITICAL: Use Pino structured logging for production monitoring  
			this.logger.error(
				{
					error: {
						name: exception.constructor.name,
						message: exception.message,
						stack: process.env.NODE_ENV !== 'production' ? exception.stack : undefined
					},
					request: {
						method: request.method,
						path: request.url,
						body: this.sanitizeRequestBody(request.body)
					},
					userId: request.user?.id
				},
				`CRITICAL ERROR: ${exception.message}`
			)
			error = 'Internal Server Error'
		} else {
			status = HttpStatus.INTERNAL_SERVER_ERROR
			message = 'Internal server error'
			error = 'Unknown Error'

			// Log unknown exceptions with Pino structured format
			this.logger.error(
				{ unknownException: exception },
				'Unknown exception type encountered'
			)
		}

		// Standard error response format using shared types
		const errorResponse: FastifyErrorResponse = {
			success: false,
			statusCode: status,
			message,
			error,
			timestamp: new Date().toISOString(),
			path: request.url
		}

		// Log error with context (but not sensitive details)
		const errorName = typeof error === 'string' ? error : 'Error'

		// Safely extract logging values (handle mock objects in tests)
		const safeMethod = (() => {
			try {
				return typeof request.method === 'string'
					? request.method
					: 'UNKNOWN'
			} catch {
				return 'UNKNOWN'
			}
		})()

		const safeUrl = (() => {
			try {
				return typeof request.url === 'string' ? request.url : '/'
			} catch {
				return '/'
			}
		})()

		const logContext: ErrorLogContext = {
			method: safeMethod,
			url: safeUrl,
			status: Number(status) || 500,
			errorName: String(errorName),
			message: String(message || 'Unknown error'),
			userId: request.user?.id,
			timestamp: new Date().toISOString()
		}

		// Use Pino structured logging for final error summary (with automatic request context)
		if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
			this.logger.error(
				logContext,
				`${logContext.method} ${logContext.url} - ${logContext.status} ${logContext.errorName}`
			)
		} else {
			this.logger.warn(
				logContext,
				`${logContext.method} ${logContext.url} - ${logContext.status} ${logContext.errorName}`
			)
		}

		response.status(status).send(errorResponse)
	}
}
