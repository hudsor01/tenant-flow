/**
 * Production-ready logging and error handling utilities
 */

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3
}

interface LogEntry {
	level: LogLevel
	message: string
	timestamp: string
	context?: Record<string, unknown>
	error?: Error
}

class Logger {
	private isDevelopment = import.meta.env.DEV

	private formatMessage(entry: LogEntry): string {
		const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']
		const prefix = `[${entry.timestamp}] ${levelNames[entry.level]}`

		if (entry.context || entry.error) {
			return `${prefix}: ${entry.message}\nContext: ${JSON.stringify(entry.context, null, 2)}`
		}

		return `${prefix}: ${entry.message}`
	}

	private log(
		level: LogLevel,
		message: string,
		context?: Record<string, unknown>,
		error?: Error
	) {
		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			context,
			error
		}

		// Only log in development or for errors/warnings in production
		if (this.isDevelopment || level >= LogLevel.WARN) {
			const formattedMessage = this.formatMessage(entry)

			switch (level) {
				case LogLevel.DEBUG:
					console.debug(formattedMessage, context, error)
					break
				case LogLevel.INFO:
					console.info(formattedMessage, context, error)
					break
				case LogLevel.WARN:
					console.warn(formattedMessage, context, error)
					break
				case LogLevel.ERROR:
					console.error(formattedMessage, context, error)
					break
			}
		}
	}

	debug(message: string, context?: Record<string, unknown>) {
		this.log(LogLevel.DEBUG, message, context)
	}

	info(message: string, context?: Record<string, unknown>) {
		this.log(LogLevel.INFO, message, context)
	}

	warn(message: string, context?: Record<string, unknown>) {
		this.log(LogLevel.WARN, message, context)
	}

	error(message: string, error?: Error, context?: Record<string, unknown>) {
		this.log(LogLevel.ERROR, message, context, error)
	}

	/**
	 * Logs authentication events for security monitoring
	 */
	authEvent(
		event: string,
		userId?: string,
		details?: Record<string, unknown>
	) {
		this.info(`Auth Event: ${event}`, {
			userId,
			userAgent: navigator.userAgent,
			timestamp: Date.now(),
			...details
		})
	}

	/**
	 * Logs database operations for debugging
	 */
	dbOperation(
		operation: string,
		table: string,
		details?: Record<string, unknown>
	) {
		this.debug(`DB Operation: ${operation} on ${table}`, details)
	}

	/**
	 * Logs API calls for debugging and monitoring
	 */
	apiCall(method: string, url: string, details?: Record<string, unknown>) {
		this.debug(`API Call: ${method} ${url}`, details)
	}

	/**
	 * Logs user actions for analytics and debugging
	 */
	userAction(
		action: string,
		userId?: string,
		details?: Record<string, unknown>
	) {
		this.info(`User Action: ${action}`, {
			userId,
			...details
		})
	}

	/**
	 * Logs payment events for audit trail
	 */
	paymentEvent(event: string, details?: Record<string, unknown>) {
		this.info(`Payment Event: ${event}`, details)
	}

	/**
	 * Logs analytics events (local only, no API calls)
	 */
	track(event: string, details?: Record<string, unknown>) {
		this.info(`Analytics Event: ${event}`, details)
	}
}

export const logger = new Logger()

/**
 * Custom error classes for better error handling
 */
export class AuthError extends Error {
	constructor(
		message: string,
		public code?: string,
		public cause?: Error
	) {
		super(message)
		this.name = 'AuthError'
	}
}

export class DatabaseError extends Error {
	constructor(
		message: string,
		public operation?: string,
		public table?: string,
		public cause?: Error
	) {
		super(message)
		this.name = 'DatabaseError'
	}
}

export class ValidationError extends Error {
	constructor(
		message: string,
		public field?: string,
		public cause?: Error
	) {
		super(message)
		this.name = 'ValidationError'
	}
}

/**
 * Error boundary helper for React components
 */
export function handleComponentError(
	error: Error,
	componentName: string,
	context?: Record<string, unknown>
) {
	logger.error(`Component Error in ${componentName}`, error, {
		component: componentName,
		...context
	})
}

/**
 * Async operation wrapper with error handling
 */
export async function withErrorHandling<T>(
	operation: () => Promise<T>,
	context: { operation: string; component?: string }
): Promise<T | null> {
	try {
		logger.debug(`Starting operation: ${context.operation}`, context)
		const result = await operation()
		logger.debug(`Completed operation: ${context.operation}`, context)
		return result
	} catch (error) {
		logger.error(
			`Failed operation: ${context.operation}`,
			error as Error,
			context
		)
		return null
	}
}
