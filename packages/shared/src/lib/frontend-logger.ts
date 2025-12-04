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
	user_id?: string
	sessionId?: string
	requestId?: string
	lease_id?: string
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
const isClient = () => typeof window !== 'undefined'
const devConsole: Partial<Console> | undefined =
	typeof globalThis !== 'undefined'
		? (globalThis['console'] as Console | undefined)
		: undefined

// Safe timestamp for Next.js Server Components
// Server-side logs skip timestamps to avoid Next.js 15 prerender errors
// (new Date() before uncached data access breaks Server Components)
const getTimestamp = () => isClient() ? new Date().toISOString() : ''

/**
 * Safe JSON stringify with circular reference handling
 */
const safeStringify = (obj: unknown): string => {
	try {
		return JSON.stringify(obj, null, 2)
	} catch {
		return String(obj)
	}
}

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

	// Serialize metadata for readable console output
	const metadataStr = entry.context?.metadata
		? safeStringify(entry.context.metadata)
		: ''

	// Only use console in development as absolute last resort
	switch (entry.level) {
		case 'DEBUG':
		case 'INFO':
			devConsole?.info?.(
				message,
				metadataStr,
				...(entry.args || [])
			)
			break
		case 'WARN':
			devConsole?.warn?.(
				message,
				metadataStr,
				...(entry.args || [])
			)
			break
		case 'ERROR':
			devConsole?.error?.(
				message,
				metadataStr,
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
					timestamp: getTimestamp(),
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
				timestamp: getTimestamp(),
				args
			}
			logEntry(entry)
		},
		warn: (message: string, context?: LogContext, ...args: unknown[]) => {
			const entry: LogEntry = {
				level: 'WARN',
				message,
				context: { ...defaultContext, ...context },
				timestamp: getTimestamp(),
				args
			}
			logEntry(entry)
		},
		error: (message: string, context?: LogContext, ...args: unknown[]) => {
			const entry: LogEntry = {
				level: 'ERROR',
				message,
				context: { ...defaultContext, ...context },
				timestamp: getTimestamp(),
				args
			}
			logEntry(entry)
		}
	}
}

/**
 * Default logger instance
 * Use this for quick logging without component context
 */
export const logger = createLogger()