/**
 * Frontend logger
 *
 * - Structured logging with optional component context
 * - Console output in development
 * - Sentry integration in production (errors → captureException, warnings → captureMessage,
 *   info → breadcrumbs attached to the next error event for free)
 */

import * as Sentry from '@sentry/nextjs'

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
const isDevelopment = () => process.env['NODE_ENV'] === 'development'
const isClient = () => typeof window !== 'undefined'
const devConsole: Partial<Console> | undefined =
	typeof globalThis !== 'undefined'
		? (globalThis['console'] as Console | undefined)
		: undefined

// Safe timestamp for Next.js Server Components
// Server-side logs skip timestamps to avoid Next.js 15 prerender errors
// (new Date() before uncached data access breaks Server Components)
const getTimestamp = () => (isClient() ? new Date().toISOString() : '')

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
			devConsole?.info?.(message, metadataStr, ...(entry.args || []))
			break
		case 'WARN':
			devConsole?.warn?.(message, metadataStr, ...(entry.args || []))
			break
		case 'ERROR':
			devConsole?.error?.(message, metadataStr, ...(entry.args || []))
			break
	}
}

/**
 * Send the entry to Sentry at the appropriate severity.
 * - ERROR: captureException (or captureMessage if no Error object passed)
 * - WARN: captureMessage with 'warning' level
 * - INFO/DEBUG: addBreadcrumb (free — attached to next error event)
 *
 * Each Sentry call is guarded — partial mocks in tests or missing SDK methods
 * in older Sentry versions will degrade gracefully instead of crashing the app.
 */
const reportToSentry = (entry: LogEntry) => {
	const extra: Record<string, unknown> = {
		...(entry.context ?? {}),
		args: entry.args && entry.args.length > 0 ? entry.args : undefined,
	}

	try {
		switch (entry.level) {
			case 'ERROR': {
				const errArg = entry.args?.find((a): a is Error => a instanceof Error)
				if (errArg && typeof Sentry.captureException === 'function') {
					Sentry.captureException(errArg, { extra: { message: entry.message, ...extra } })
				} else if (typeof Sentry.captureMessage === 'function') {
					Sentry.captureMessage(entry.message, { level: 'error', extra })
				}
				break
			}
			case 'WARN':
				if (typeof Sentry.captureMessage === 'function') {
					Sentry.captureMessage(entry.message, { level: 'warning', extra })
				}
				break
			case 'INFO':
			case 'DEBUG':
				if (typeof Sentry.addBreadcrumb === 'function') {
					Sentry.addBreadcrumb({
						category: entry.context?.component ?? 'app',
						level: entry.level === 'DEBUG' ? 'debug' : 'info',
						message: entry.message,
						...(entry.context ? { data: entry.context as Record<string, unknown> } : {}),
					})
				}
				break
		}
	} catch {
		// Never let logging break the app
	}
}

/**
 * Core logging function — dev console output + Sentry routing.
 */
const logEntry = (entry: LogEntry) => {
	developmentConsoleFallback(entry)
	reportToSentry(entry)
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
