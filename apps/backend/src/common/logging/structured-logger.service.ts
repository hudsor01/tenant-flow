import { Injectable, Logger } from '@nestjs/common'
import { ILogger, LogContext } from '@repo/shared'

/**
 * Structured Logger Service for Backend
 * Replaces all console.log statements with proper structured logging
 */
@Injectable()
export class StructuredLoggerService implements ILogger {
	private readonly logger: Logger
	private readonly environment: string

	constructor(context?: string) {
		this.logger = new Logger(context || 'App')
		this.environment = process.env.NODE_ENV || 'development'
	}

	/**
	 * Debug level logging - only in development
	 */
	debug(message: string, context?: LogContext): void {
		if (this.environment === 'development') {
			this.logger.debug(this.formatMessage(message, context))
		}
	}

	/**
	 * Info level logging
	 */
	info(message: string, context?: LogContext): void {
		this.logger.log(this.formatMessage(message, context))
	}

	/**
	 * Warning level logging
	 */
	warn(message: string, context?: LogContext): void {
		this.logger.warn(this.formatMessage(message, context))
	}

	/**
	 * Error level logging with optional error object
	 */
	error(message: string, error?: Error, context?: LogContext): void {
		const formattedMessage = this.formatMessage(message, context)
		if (error) {
			this.logger.error(formattedMessage, error.stack)
		} else {
			this.logger.error(formattedMessage)
		}
	}

	/**
	 * Format log message with context
	 */
	private formatMessage(message: string, context?: LogContext): string {
		if (!context || Object.keys(context).length === 0) {
			return message
		}

		// Create a clean context object without undefined values
		const cleanContext = Object.entries(context)
			.filter(([_, value]) => value !== undefined)
			.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

		if (Object.keys(cleanContext).length === 0) {
			return message
		}

		return `${message} ${JSON.stringify(cleanContext)}`
	}

	/**
	 * Create a child logger with additional context
	 */
	child(context: LogContext): StructuredLoggerService {
		const childLogger = new StructuredLoggerService(context.component)
		return childLogger
	}

	/**
	 * Log performance metrics
	 */
	performance(
		operation: string,
		duration: number,
		context?: LogContext
	): void {
		this.info(`Performance: ${operation}`, {
			...context,
			duration,
			operation
		})
	}

	/**
	 * Log security events
	 */
	security(event: string, context?: LogContext): void {
		this.warn(`Security: ${event}`, {
			...context,
			securityEvent: event
		})
	}

	/**
	 * Log API requests
	 */
	request(
		method: string,
		path: string,
		statusCode: number,
		duration: number,
		context?: LogContext
	): void {
		const level =
			statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info'
		const message = `${method} ${path} ${statusCode}`

		const requestContext = {
			...context,
			method,
			path,
			statusCode,
			duration
		}

		switch (level) {
			case 'error':
				this.error(message, undefined, requestContext)
				break
			case 'warn':
				this.warn(message, requestContext)
				break
			default:
				this.info(message, requestContext)
		}
	}
}
