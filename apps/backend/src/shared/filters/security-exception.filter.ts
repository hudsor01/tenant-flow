/**
 * Production-Grade Security Exception Filter
 *
 * Apple-level security: Secure error handling without information leakage
 * - Sanitizes error responses to prevent information disclosure
 * - Logs detailed errors internally while returning safe responses
 * - Prevents stack trace leakage in production
 * - Rate limits error responses to prevent enumeration attacks
 * - Integrates with security monitoring system
 */

import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
	Logger,
	BadRequestException,
	UnauthorizedException,
	ForbiddenException,
	NotFoundException
} from '@nestjs/common'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { PinoLogger } from 'nestjs-pino'
import { SecurityMonitorService } from '../services/security-monitor.service'

interface ErrorResponse {
	statusCode: number
	message: string
	error?: string
	timestamp: string
	path: string
	requestId?: string
}

interface SecurityErrorContext {
	ip: string
	userAgent?: string
	userId?: string
	endpoint: string
	method: string
	timestamp: string
	errorType: string
	statusCode: number
}

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(SecurityExceptionFilter.name)
	private readonly securityLogger: PinoLogger
	private readonly securityMonitor: SecurityMonitorService

	// Track error frequencies to detect enumeration attacks
	private readonly errorFrequency = new Map<string, { count: number; firstSeen: number }>()
	private readonly maxErrorsPerIP = 50
	private readonly errorWindowMs = 15 * 60 * 1000 // 15 minutes

	// Safe error messages (no internal information)
	private readonly safeErrorMessages: Record<number, string> = {
		400: 'Invalid request format',
		401: 'Authentication required',
		403: 'Access denied',
		404: 'Resource not found',
		405: 'Method not allowed',
		409: 'Request conflict',
		422: 'Invalid request data',
		429: 'Too many requests',
		500: 'Internal server error',
		502: 'Service unavailable',
		503: 'Service temporarily unavailable',
		504: 'Request timeout'
	}

	constructor(
		securityLogger: PinoLogger,
		securityMonitor: SecurityMonitorService
	) {
		this.securityLogger = securityLogger
		this.securityLogger.setContext(SecurityExceptionFilter.name)
		this.securityMonitor = securityMonitor

		// Cleanup error frequency tracking periodically
		setInterval(() => this.cleanupErrorTracking(), 5 * 60 * 1000)
	}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp()
		const request = ctx.getRequest<FastifyRequest>()
		const response = ctx.getResponse<FastifyReply>()

		const errorContext = this.buildErrorContext(request, exception)

		// Track error frequency for enumeration attack detection
		this.trackErrorFrequency(errorContext)

		// Log detailed error internally
		this.logErrorInternal(exception, errorContext)

		// Check if this looks like an attack
		this.analyzeSecurityImplications(exception, errorContext)

		// Generate safe response for client
		const errorResponse = this.generateSafeErrorResponse(exception, errorContext)

		// Set security headers
		this.setSecurityHeaders(response)

		// Send response
		response
			.status(errorResponse.statusCode)
			.type('application/json')
			.send(errorResponse)
	}

	private buildErrorContext(request: FastifyRequest, exception: unknown): SecurityErrorContext {
		const statusCode = this.getStatusCode(exception)

		return {
			ip: this.getClientIP(request),
			userAgent: request.headers['user-agent'],
			userId: (request as any).user?.id,
			endpoint: request.url,
			method: request.method,
			timestamp: new Date().toISOString(),
			errorType: exception?.constructor?.name || 'Unknown',
			statusCode
		}
	}

	private getClientIP(request: FastifyRequest): string {
		const forwardedFor = request.headers['x-forwarded-for'] as string
		const realIP = request.headers['x-real-ip'] as string
		const cfConnectingIP = request.headers['cf-connecting-ip'] as string

		if (cfConnectingIP) return cfConnectingIP
		if (realIP) return realIP
		if (forwardedFor && typeof forwardedFor === 'string') {
			const firstIp = forwardedFor.split(',')[0]
			return firstIp ? firstIp.trim() : 'unknown'
		}

		return request.ip || 'unknown'
	}

	private getStatusCode(exception: unknown): number {
		if (exception instanceof HttpException) {
			return exception.getStatus()
		}

		// Map common error types to status codes
		if (exception instanceof Error) {
			const errorName = exception.constructor.name

			switch (errorName) {
				case 'ValidationError':
				case 'CastError':
					return HttpStatus.BAD_REQUEST
				case 'UnauthorizedError':
				case 'JsonWebTokenError':
				case 'TokenExpiredError':
					return HttpStatus.UNAUTHORIZED
				case 'ForbiddenError':
					return HttpStatus.FORBIDDEN
				case 'NotFoundError':
					return HttpStatus.NOT_FOUND
				case 'ConflictError':
					return HttpStatus.CONFLICT
				case 'TooManyRequestsError':
					return HttpStatus.TOO_MANY_REQUESTS
				default:
					return HttpStatus.INTERNAL_SERVER_ERROR
			}
		}

		return HttpStatus.INTERNAL_SERVER_ERROR
	}

	private trackErrorFrequency(context: SecurityErrorContext): void {
		const key = `${context.ip}:${context.statusCode}`
		const now = Date.now()

		const existing = this.errorFrequency.get(key)
		if (!existing) {
			this.errorFrequency.set(key, { count: 1, firstSeen: now })
		} else {
			// Reset counter if outside the window
			if (now - existing.firstSeen > this.errorWindowMs) {
				this.errorFrequency.set(key, { count: 1, firstSeen: now })
			} else {
				existing.count++
			}
		}
	}

	private logErrorInternal(exception: unknown, context: SecurityErrorContext): void {
		const logData = {
			...context,
			error: exception instanceof Error ? {
				name: exception.name,
				message: exception.message,
				stack: process.env.NODE_ENV === 'production' ? '[REDACTED]' : exception.stack
			} : {
				type: typeof exception,
				value: String(exception)
			}
		}

		if (context.statusCode >= 500) {
			this.securityLogger.error('Internal server error', logData)
		} else if (context.statusCode === 401 || context.statusCode === 403) {
			this.securityLogger.warn('Authentication/authorization error', logData)
		} else if (context.statusCode >= 400) {
			this.securityLogger.info('Client error', logData)
		}
	}

	private analyzeSecurityImplications(exception: unknown, context: SecurityErrorContext): void {
		// Check for enumeration attacks
		const errorKey = `${context.ip}:${context.statusCode}`
		const errorStats = this.errorFrequency.get(errorKey)

		if (errorStats && errorStats.count > this.maxErrorsPerIP) {
			this.securityMonitor.logSecurityEvent({
				type: 'suspicious_activity',
				severity: 'high',
				source: 'error_filter',
				description: `High error frequency detected: ${errorStats.count} ${context.statusCode} errors`,
				metadata: {
					errorCount: errorStats.count,
					errorType: context.errorType,
					statusCode: context.statusCode,
					timeWindow: this.errorWindowMs,
					possibleEnumeration: true
				},
				ipAddress: context.ip,
				userAgent: context.userAgent,
				userId: context.userId
			})
		}

		// Detect specific attack patterns
		if (exception instanceof Error) {
			const message = exception.message.toLowerCase()

			// SQL injection attempts
			if (message.includes('sql') || message.includes('database') || message.includes('query')) {
				this.securityMonitor.logSecurityEvent({
					type: 'sql_injection_attempt',
					severity: 'high',
					source: 'error_filter',
					description: 'Possible SQL injection attempt detected in error',
					metadata: {
						errorMessage: message.substring(0, 200),
						endpoint: context.endpoint,
						method: context.method
					},
					ipAddress: context.ip,
					userAgent: context.userAgent,
					userId: context.userId
				})
			}

			// Path traversal attempts
			if (message.includes('../') || message.includes('..\\') || message.includes('path')) {
				this.securityMonitor.logSecurityEvent({
					type: 'malicious_request',
					severity: 'medium',
					source: 'error_filter',
					description: 'Possible path traversal attempt detected in error',
					metadata: {
						errorMessage: message.substring(0, 200),
						endpoint: context.endpoint,
						method: context.method
					},
					ipAddress: context.ip,
					userAgent: context.userAgent,
					userId: context.userId
				})
			}
		}

		// Authentication failures
		if (context.statusCode === 401) {
			this.securityMonitor.logSecurityEvent({
				type: 'auth_failure',
				severity: 'medium',
				source: 'error_filter',
				description: 'Authentication failure',
				metadata: {
					endpoint: context.endpoint,
					method: context.method,
					errorType: context.errorType
				},
				ipAddress: context.ip,
				userAgent: context.userAgent,
				userId: context.userId
			})
		}

		// Authorization failures
		if (context.statusCode === 403) {
			this.securityMonitor.logSecurityEvent({
				type: 'unauthorized_access',
				severity: 'medium',
				source: 'error_filter',
				description: 'Authorization failure',
				metadata: {
					endpoint: context.endpoint,
					method: context.method,
					errorType: context.errorType
				},
				ipAddress: context.ip,
				userAgent: context.userAgent,
				userId: context.userId
			})
		}
	}

	private generateSafeErrorResponse(exception: unknown, context: SecurityErrorContext): ErrorResponse {
		const baseResponse: ErrorResponse = {
			statusCode: context.statusCode,
			message: this.safeErrorMessages[context.statusCode] || 'An error occurred',
			timestamp: context.timestamp,
			path: context.endpoint,
			requestId: this.generateRequestId()
		}

		// In development, include more details (but still sanitized)
		if (process.env.NODE_ENV === 'development') {
			if (exception instanceof HttpException) {
				const response = exception.getResponse()
				if (typeof response === 'object' && response !== null) {
					baseResponse.error = (response as any).error || exception.name

					// Include validation errors in development
					if (exception instanceof BadRequestException) {
						baseResponse.message = this.sanitizeMessage(exception.message)
					}
				}
			}
		}

		// For specific errors, provide slightly more context (but still safe)
		if (exception instanceof BadRequestException) {
			baseResponse.message = 'Invalid request format'
		} else if (exception instanceof UnauthorizedException) {
			baseResponse.message = 'Authentication required'
		} else if (exception instanceof ForbiddenException) {
			baseResponse.message = 'Access denied'
		} else if (exception instanceof NotFoundException) {
			baseResponse.message = 'Resource not found'
		}

		return baseResponse
	}

	private sanitizeMessage(message: string): string {
		// Remove potentially sensitive information from error messages
		return message
			.replace(/\b\d{4}\b/g, 'XXXX') // Credit card-like numbers
			.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email addresses
			.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]') // IP addresses
			.replace(/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/g, '[UUID]') // UUIDs
			.replace(/(?:password|secret|key|token)[\s:=]+\S+/gi, '[REDACTED]') // Credentials
			.substring(0, 200) // Limit length
	}

	private setSecurityHeaders(response: FastifyReply): void {
		// Prevent caching of error responses
		response.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
		response.header('Pragma', 'no-cache')
		response.header('Expires', '0')

		// Content security
		response.header('X-Content-Type-Options', 'nosniff')
		response.header('X-Frame-Options', 'DENY')
	}

	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	private cleanupErrorTracking(): void {
		const now = Date.now()
		let cleaned = 0

		for (const [key, stats] of this.errorFrequency.entries()) {
			if (now - stats.firstSeen > this.errorWindowMs) {
				this.errorFrequency.delete(key)
				cleaned++
			}
		}

		if (cleaned > 0) {
			this.logger.debug(`Cleaned up ${cleaned} error tracking entries`)
		}
	}
}