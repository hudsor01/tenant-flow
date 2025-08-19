import { Injectable, Logger, LogLevel, Scope } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * Native NestJS Logger Service
 * 
 * Replaces Winston with NestJS native logging functionality.
 * Uses NestJS built-in Logger class for consistency with framework.
 * 
 * @see https://docs.nestjs.com/techniques/logger
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends Logger {
	private readonly isDevelopment: boolean
	
	constructor(
		private readonly configService: ConfigService,
		context?: string
	) {
		super(context || 'Application')
		this.isDevelopment = this.configService.get('NODE_ENV') !== 'production'
		// Initialize log levels during construction
		this.initializeLogLevels()
	}
	
	private getLogLevels(): LogLevel[] {
		const logLevel = this.configService.get('LOG_LEVEL', 'info')
		const levels: LogLevel[] = ['error', 'warn', 'log']
		
		if (logLevel === 'debug' || logLevel === 'verbose') {
			levels.push('debug', 'verbose')
		}
		
		return levels
	}
	
	/**
	 * Initialize log levels (called during construction)
	 */
	private initializeLogLevels(): void {
		// This method ensures getLogLevels is used during initialization
		const levels = this.getLogLevels()
		if (this.isDevelopment) {
			this.debug(`Logger initialized with levels: ${levels.join(', ')}`)
		}
	}
	
	/**
	 * Log with request context
	 */
	logWithContext(
		message: string,
		context: Record<string, unknown>,
		level: 'log' | 'error' | 'warn' | 'debug' | 'verbose' = 'log'
	): void {
		const enrichedMessage = this.isDevelopment
			? `${message} ${JSON.stringify(context, null, 2)}`
			: JSON.stringify({ message, ...context })
			
		this[level](enrichedMessage)
	}
	
	/**
	 * Performance logging
	 */
	logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
		const context = {
			operation,
			duration,
			...metadata
		}
		
		if (duration > 1000) {
			this.warn(`Slow operation: ${operation} took ${duration}ms`, JSON.stringify(context))
		} else {
			this.debug(`Performance: ${operation} took ${duration}ms`, JSON.stringify(context))
		}
	}
	
	/**
	 * Security event logging
	 */
	logSecurity(event: string, details: Record<string, unknown>): void {
		this.warn(`Security Event: ${event}`, JSON.stringify({
			event,
			timestamp: new Date().toISOString(),
			...details
		}))
	}
	
	/**
	 * Audit logging
	 */
	logAudit(action: string, userId: string, details: Record<string, unknown>): void {
		this.log(`Audit: ${action}`, JSON.stringify({
			action,
			userId,
			timestamp: new Date().toISOString(),
			...details
		}))
	}

	/**
	 * Set context for this logger instance (compatibility method)
	 */
	setContext(context: string): void {
		// NestJS Logger doesn't support runtime context changes,
		// but we can override the context property
		;(this as Logger & { context: string }).context = context
	}

	/**
	 * Log request information (compatibility method)
	 */
	logRequest(message: string, context?: Record<string, unknown>): void {
		this.logWithContext(message, context || {}, 'log')
	}

	/**
	 * Log error with context (compatibility method)
	 */
	logError(message: string, error?: Error, context?: string): void {
		if (error) {
			this.error(message, error.stack, context)
		} else {
			this.error(message, undefined, context)
		}
	}

	/**
	 * Log with metadata (compatibility method)
	 */
	logWithMetadata(message: string, metadata: Record<string, unknown>): void {
		this.logWithContext(message, metadata, 'log')
	}
}