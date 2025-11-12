/**
 * Lightweight frontend logger
 *
 * - Structured logging with optional component context
 * - Console output limited to development environments
 * - Safe no-op in production (no third-party dependencies)
 */

// TypeScript interfaces for structured logging
export interface LogContext {
	component?: string
	action?: string
	userId?: string
	sessionId?: string
	requestId?: string
	leaseId?: string
	metadata?: Record<string, unknown>
	[key: string]: unknown
}

export interface LogEntry {
	level: LogLevel
	message: string
	context?: LogContext
	timestamp: string
	args?: unknown[]
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

// Environment checks
const isDevelopment = () => process.env["NODE_ENV"] === 'development'
const devConsole: Partial<Console> | undefined =
	typeof globalThis !== 'undefined'
		? (globalThis['console'] as Console | undefined)
		: undefined

/**
 * Development-only console logger
 * This is the ONLY place console methods are used
 */
const developmentConsoleFallback = (entry: LogEntry) => {
	if (!isDevelopment()) return

	const timestamp = entry.timestamp
	const contextStr = entry.context?.component
		? `[${entry.context.component}]`
		: ''
	const message = `${timestamp} [${entry.level}]${contextStr} ${entry.message}`

	// Only use console in development as absolute last resort
	switch (entry.level) {
		case 'DEBUG':
		case 'INFO':
			devConsole?.info?.(
				message,
				entry.context?.metadata || '',
				...(entry.args || [])
			)
			break
		case 'WARN':
			devConsole?.warn?.(
				message,
				entry.context?.metadata || '',
				...(entry.args || [])
			)
			break
		case 'ERROR':
			devConsole?.error?.(
				message,
				entry.context?.metadata || '',
				...(entry.args || [])
			)
			break
	}
}

/**
 * Core logging function - delegates to the development console logger
 */
const logEntry = (entry: LogEntry) => {
	developmentConsoleFallback(entry)
}

/**
 * Create a contextual logger for a specific component
 * This is the recommended way to create loggers
 */
export const createLogger = (defaultContext?: LogContext) => {
	return {
		debug: (message: string, context?: LogContext, ...args: unknown[]) => {
			// Debug logs only in development
			if (isDevelopment()) {
				const entry: LogEntry = {
					level: 'DEBUG',
					message,
					context: { ...defaultContext, ...context },
					timestamp: new Date().toISOString(),
					args
				}
				logEntry(entry)
			}
		},
		info: (message: string, context?: LogContext, ...args: unknown[]) => {
			const entry: LogEntry = {
				level: 'INFO',
				message,
				context: { ...defaultContext, ...context },
				timestamp: new Date().toISOString(),
				args
			}
			logEntry(entry)
		},
		warn: (message: string, context?: LogContext, ...args: unknown[]) => {
			const entry: LogEntry = {
				level: 'WARN',
				message,
				context: { ...defaultContext, ...context },
				timestamp: new Date().toISOString(),
				args
			}
			logEntry(entry)
		},
		error: (message: string, context?: LogContext, ...args: unknown[]) => {
			const entry: LogEntry = {
				level: 'ERROR',
				message,
				context: { ...defaultContext, ...context },
				timestamp: new Date().toISOString(),
				args
			}
			logEntry(entry)
		}
	}
}

// Default logger instance (backward compatibility)
export const logger = createLogger()

export default logger
