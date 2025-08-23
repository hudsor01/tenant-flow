import { Injectable, Logger } from '@nestjs/common'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { ControllerApiResponse } from '@repo/shared'
import type { ValidatedUser } from '../../auth/auth.service'

interface AuthenticatedRequest extends FastifyRequest {
	user?: ValidatedUser
	context: {
		correlationId: string
		startTime: number
		userId?: string
		organizationId?: string
	}
}

interface ErrorContext {
	correlationId?: string
	userId?: string
	organizationId?: string
	endpoint: string
	method: string
	ip?: string
	userAgent?: string
}

interface SecurityEventData {
	eventType: string
	severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
	context: ErrorContext
	additionalData?: Record<string, unknown>
}

/**
 * Error Response Hooks Service
 * 
 * Provides centralized error handling and response shaping hooks:
 * - Standardizes error responses across all endpoints
 * - Handles security event logging
 * - Manages error redaction for sensitive data
 * - Provides consistent error formatting
 * - Tracks error patterns for monitoring
 */
@Injectable()
export class ErrorResponseHooksService {
	private readonly logger = new Logger(ErrorResponseHooksService.name)
	
	// Error tracking for patterns
	private readonly errorCounts = new Map<string, number>()
	private readonly securityEvents: SecurityEventData[] = []

	// Sensitive fields to redact from error responses
	private readonly sensitiveFields = new Set([
		'password', 'token', 'secret', 'key', 'authorization',
		'stripe_secret', 'stripe_key', 'supabase_key', 'jwt_secret',
		'credit_card', 'ssn', 'social_security', 'bank_account'
	])

	/**
	 * Register error handling and response shaping hooks
	 */
	registerErrorHooks(fastify: FastifyInstance): void {
		// Error transformation and logging
		fastify.addHook('onError', this.handleErrorTransformation.bind(this))
		
		// Response standardization and security headers
		fastify.addHook('onSend', this.handleResponseStandardization.bind(this))
		
		// Security event processing
		fastify.addHook('onResponse', this.processSecurityEvents.bind(this))

		this.logger.log('Error response hooks registered successfully')
	}

	/**
	 * Handle error transformation and security logging
	 */
	private async handleErrorTransformation(
		request: FastifyRequest,
		reply: FastifyReply,
		error: Error
	): Promise<void> {
		const req = request as AuthenticatedRequest
		const context = this.buildErrorContext(req)

		// Log the error with context
		this.logErrorWithContext(error, context)

		// Track error patterns
		this.trackErrorPattern(error, context)

		// Determine if this is a security-related error
		if (this.isSecurityError(error)) {
			this.recordSecurityEvent({
				eventType: 'SECURITY_ERROR',
				severity: this.getErrorSeverity(error),
				context,
				additionalData: {
					errorType: error.constructor.name,
					errorMessage: error.message
				}
			})
		}

		// Transform error for response (NestJS will handle the actual response formatting)
		// We primarily log and track here, letting NestJS exception filters handle responses
	}

	/**
	 * Handle response standardization and security headers
	 */
	private async handleResponseStandardization(
		request: FastifyRequest,
		reply: FastifyReply,
		payload: unknown
	): Promise<unknown> {
		const req = request as AuthenticatedRequest

		// Add security headers for error responses
		if (reply.statusCode >= 400) {
			this.addErrorSecurityHeaders(reply)
		}

		// Redact sensitive data from responses
		const cleanPayload = this.redactSensitiveData(payload)

		// Ensure consistent error response format
		const standardizedPayload = this.standardizeErrorResponse(cleanPayload, req, reply)

		return standardizedPayload
	}

	/**
	 * Process accumulated security events
	 */
	private async processSecurityEvents(
		_request: FastifyRequest,
		_reply: FastifyReply
	): Promise<void> {
		// Process any queued security events
		if (this.securityEvents.length > 0) {
			// In a real implementation, this might send to a SIEM system
			this.logger.warn(`Processed ${this.securityEvents.length} security events for request`)
			this.securityEvents.length = 0 // Clear the queue
		}

		// Log patterns if error count threshold exceeded
		this.logErrorPatterns()
	}

	// ========== Error Processing Methods ==========

	private buildErrorContext(req: AuthenticatedRequest): ErrorContext {
		return {
			correlationId: req.context?.correlationId || 'unknown',
			userId: req.user?.id || req.context?.userId,
			organizationId: req.user?.organizationId || req.context?.organizationId,
			endpoint: req.url || 'unknown',
			method: req.method || 'unknown',
			ip: req.ip || 'unknown',
			userAgent: req.headers['user-agent']
		}
	}

	private logErrorWithContext(error: Error, context: ErrorContext): void {
		this.logger.error(
			`[${context.correlationId}] ${error.constructor.name}: ${error.message}`,
			{
				error: error.message,
				stack: error.stack,
				context,
				timestamp: new Date().toISOString()
			}
		)
	}

	private trackErrorPattern(error: Error, context: ErrorContext): void {
		const patternKey = `${error.constructor.name}:${context.endpoint}`
		const currentCount = this.errorCounts.get(patternKey) || 0
		this.errorCounts.set(patternKey, currentCount + 1)

		// Alert on error pattern spikes
		if (currentCount > 10) {
			this.logger.warn(
				`Error pattern spike detected: ${patternKey} occurred ${currentCount} times`
			)
		}
	}

	private isSecurityError(error: Error): boolean {
		const securityErrorTypes = [
			'UnauthorizedException',
			'ForbiddenException',
			'TokenExpiredException',
			'InvalidTokenException',
			'AuthenticationError',
			'AuthorizationError'
		]

		return securityErrorTypes.includes(error.constructor.name) ||
			   error.message.toLowerCase().includes('unauthorized') ||
			   error.message.toLowerCase().includes('forbidden') ||
			   error.message.toLowerCase().includes('token') ||
			   error.message.toLowerCase().includes('auth')
	}

	private getErrorSeverity(error: Error): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
		// Critical errors
		if (error.message.includes('SQL injection') || 
			error.message.includes('XSS') ||
			error.message.includes('CSRF')) {
			return 'CRITICAL'
		}

		// High severity
		if (error.constructor.name.includes('Unauthorized') ||
			error.constructor.name.includes('Forbidden') ||
			error.message.includes('permission')) {
			return 'HIGH'
		}

		// Medium severity  
		if (error.constructor.name.includes('Validation') ||
			error.constructor.name.includes('BadRequest')) {
			return 'MEDIUM'
		}

		// Default to low
		return 'LOW'
	}

	private recordSecurityEvent(event: SecurityEventData): void {
		this.securityEvents.push(event)
		
		// Log immediately for critical events
		if (event.severity === 'CRITICAL') {
			this.logger.error(`CRITICAL SECURITY EVENT: ${event.eventType}`, event)
		}
	}

	private addErrorSecurityHeaders(reply: FastifyReply): void {
		reply.header('x-content-type-options', 'nosniff')
		reply.header('x-frame-options', 'DENY')
		reply.header('referrer-policy', 'no-referrer')
	}

	private redactSensitiveData(payload: unknown): unknown {
		if (!payload || typeof payload !== 'object') {
			return payload
		}

		// Deep clone to avoid mutating original
		const cleaned = JSON.parse(JSON.stringify(payload))

		return this.redactObjectFields(cleaned)
	}

	private redactObjectFields(obj: any): any {
		if (Array.isArray(obj)) {
			return obj.map(item => this.redactObjectFields(item))
		}

		if (obj && typeof obj === 'object') {
			for (const key in obj) {
				const lowerKey = key.toLowerCase()
				
				// Redact sensitive fields
				if (this.sensitiveFields.has(lowerKey) || 
					this.containsSensitivePattern(lowerKey)) {
					obj[key] = '[REDACTED]'
				} else if (typeof obj[key] === 'object') {
					obj[key] = this.redactObjectFields(obj[key])
				}
			}
		}

		return obj
	}

	private containsSensitivePattern(key: string): boolean {
		const sensitivePatterns = [
			'password', 'secret', 'token', 'key', 'auth',
			'credit', 'card', 'ssn', 'social', 'bank'
		]
		
		return sensitivePatterns.some(pattern => key.includes(pattern))
	}

	private standardizeErrorResponse(
		payload: unknown,
		req: AuthenticatedRequest,
		reply: FastifyReply
	): unknown {
		// Only standardize actual error responses (4xx, 5xx)
		if (reply.statusCode < 400) {
			return payload
		}

		// If already in standard format, return as-is
		if (this.isStandardErrorResponse(payload)) {
			return payload
		}

		// Create standard error response format
		const standardError: ControllerApiResponse = {
			success: false,
			data: null,
			error: {
				code: this.getErrorCode(reply.statusCode),
				message: this.getErrorMessage(payload),
				statusCode: reply.statusCode
			},
			timestamp: new Date().toISOString()
		}

		// Add correlation ID if available
		if (req.context?.correlationId) {
			standardError.correlationId = req.context.correlationId
		}

		return standardError
	}

	private isStandardErrorResponse(payload: unknown): boolean {
		return (
			typeof payload === 'object' &&
			payload !== null &&
			'success' in payload &&
			'error' in payload &&
			'timestamp' in payload
		)
	}

	private getErrorCode(statusCode: number): string {
		const errorCodes: Record<number, string> = {
			400: 'BAD_REQUEST',
			401: 'UNAUTHORIZED',
			403: 'FORBIDDEN',
			404: 'NOT_FOUND',
			405: 'METHOD_NOT_ALLOWED',
			409: 'CONFLICT',
			422: 'VALIDATION_ERROR',
			429: 'RATE_LIMIT_EXCEEDED',
			500: 'INTERNAL_SERVER_ERROR',
			502: 'BAD_GATEWAY',
			503: 'SERVICE_UNAVAILABLE',
			504: 'GATEWAY_TIMEOUT'
		}

		return errorCodes[statusCode] || 'UNKNOWN_ERROR'
	}

	private getErrorMessage(payload: unknown): string {
		if (typeof payload === 'string') {
			return payload
		}

		if (typeof payload === 'object' && payload !== null) {
			const obj = payload as any
			return obj.message || obj.error || 'An error occurred'
		}

		return 'An unknown error occurred'
	}

	private logErrorPatterns(): void {
		// Log error patterns every 100 requests (simple throttling)
		if (Math.random() < 0.01) { // 1% chance
			const topErrors = Array.from(this.errorCounts.entries())
				.sort(([,a], [,b]) => b - a)
				.slice(0, 5)

			if (topErrors.length > 0) {
				this.logger.warn('Top error patterns:', Object.fromEntries(topErrors))
			}
		}
	}

	// ========== Public Methods for Monitoring ==========

	/**
	 * Get current error statistics
	 */
	public getErrorStatistics(): Record<string, number> {
		return Object.fromEntries(this.errorCounts)
	}

	/**
	 * Clear error statistics (useful for testing or periodic cleanup)
	 */
	public clearErrorStatistics(): void {
		this.errorCounts.clear()
		this.logger.debug('Error statistics cleared')
	}

	/**
	 * Get recent security events (for monitoring/alerting)
	 */
	public getRecentSecurityEvents(): SecurityEventData[] {
		return [...this.securityEvents]
	}
}