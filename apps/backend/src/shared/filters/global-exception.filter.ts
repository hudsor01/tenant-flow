import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger
} from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Global exception filter using native NestJS patterns
 * Replaces custom ErrorHandlerService with standard NestJS exception handling
 * 
 * Following CLAUDE.md RULE #3: No abstractions - direct NestJS usage only
 * 
 * SECURITY: Sanitizes request bodies before logging to prevent sensitive data exposure
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GlobalExceptionFilter.name)

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
			const sanitized = JSON.parse(JSON.stringify(body))
			
			const redactSensitiveFields = (obj: any): void => {
				if (obj && typeof obj === 'object') {
					for (const key in obj) {
						if (obj.hasOwnProperty(key)) {
							const lowerKey = key.toLowerCase()
							
							// Check if field name contains sensitive patterns
							const isSensitive = sensitiveFields.some(pattern => 
								lowerKey.includes(pattern.toLowerCase())
							)
							
							if (isSensitive) {
								obj[key] = '[REDACTED]'
							} else if (typeof obj[key] === 'object' && obj[key] !== null) {
								redactSensitiveFields(obj[key])
							}
						}
					}
				}
			}

			redactSensitiveFields(sanitized)
			return sanitized
		} catch (_error) {
			// If sanitization fails, return safe fallback
			return { error: 'Unable to sanitize request body' }
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
		const request = ctx.getRequest<FastifyRequest>()

		let status: number
		let message: string
		let error: string

		if (exception instanceof HttpException) {
			status = exception.getStatus()
			const exceptionResponse = exception.getResponse()
			
			if (typeof exceptionResponse === 'object' && exceptionResponse !== null && !Array.isArray(exceptionResponse)) {
				const responseObj = exceptionResponse as Record<string, unknown>
				message = (typeof responseObj.message === 'string' 
					? responseObj.message 
					: Array.isArray(responseObj.message)
						? responseObj.message.join(', ')
						: exception.message)
				error = (typeof responseObj.error === 'string' 
					? responseObj.error 
					: 'HTTP Exception')
			} else {
				message = String(exceptionResponse)
				// Get the HTTP status text for common status codes
				error = this.getHttpStatusText(status)
			}
		} else if (exception instanceof Error) {
			status = HttpStatus.INTERNAL_SERVER_ERROR
			message = 'Internal server error'
			
			// CRITICAL: Log full error details for production monitoring (with sanitized body)
			this.logger.error(
				`CRITICAL ERROR: ${exception.message}`,
				exception.stack,
				{
					path: request.url,
					method: request.method,
					body: this.sanitizeRequestBody(request.body),
					userId: (request as any).user?.id
				}
			)
			error = 'Internal Server Error'
			
			// Log the actual error for debugging (not exposed to client)
			this.logger.error(`Unhandled error: ${exception.message}`, exception.stack)
		} else {
			status = HttpStatus.INTERNAL_SERVER_ERROR
			message = 'Internal server error'
			error = 'Unknown Error'
			
			// Log unknown exceptions
			this.logger.error('Unknown exception type:', exception)
		}

		// Standard error response format
		const errorResponse = {
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
				return typeof request.method === 'string' ? request.method : 'UNKNOWN'
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
		
		const logContext = {
			method: safeMethod,
			url: safeUrl,
			status: Number(status) || 500,
			errorName: String(errorName),
			message: String(message || 'Unknown error')
		}
		
		if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
			this.logger.error(
				`${logContext.method} ${logContext.url} - ${logContext.status} ${logContext.errorName}: ${logContext.message}`
			)
		} else {
			this.logger.warn(
				`${logContext.method} ${logContext.url} - ${logContext.status} ${logContext.errorName}: ${logContext.message}`
			)
		}

		response.status(status).send(errorResponse)
	}
}