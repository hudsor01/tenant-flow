/**
 * Production-Ready Frontend Logger using PostHog
 *
 * NO CONSOLE USAGE - Uses PostHog for all logging in production
 * - Structured logging with component context
 * - Development-only console fallback
 * - TypeScript interfaces for type safety
 * - Aligned with existing PostHog integration
 * - Consistent with backend NestJS Logger patterns
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
const isDevelopment = () => process.env.NODE_ENV === 'development'

/**
 * Get PostHog instance safely
 */
const getPostHog = () => {
	if (typeof window !== 'undefined') {
		// Check for PostHog on window (set by PostHogProvider)
		return (window as typeof window & { posthog?: unknown }).posthog || null
	}
	return null
}

/**
 * Send log to PostHog - primary logging method
 */
const logToPostHog = (entry: LogEntry) => {
	const posthog = getPostHog()
	if (!posthog) return false

	try {
		// Use PostHog capture for structured logging
		posthog.capture('frontend_log', {
			level: entry.level,
			message: entry.message,
			component: entry.context?.component,
			action: entry.context?.action,
			userId: entry.context?.userId,
			sessionId: entry.context?.sessionId,
			metadata: entry.context?.metadata,
			timestamp: entry.timestamp,
			// Additional context
			url: typeof window !== 'undefined' ? window.location.href : undefined,
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
		})
		return true
	} catch {
		// Silently fail PostHog logging - never break app functionality
		return false
	}
}

/**
 * Development-only console fallback (when PostHog not available)
 * This is the ONLY place console methods are used
 */
const developmentConsoleFallback = (entry: LogEntry) => {
	if (!isDevelopment()) return

	const timestamp = entry.timestamp
	const contextStr = entry.context?.component ? `[${entry.context.component}]` : ''
	const message = `${timestamp} [${entry.level}]${contextStr} ${entry.message}`

	// Only use console in development as absolute last resort
	switch (entry.level) {
		case 'DEBUG':
		case 'INFO':
			console.info(message, entry.context?.metadata || '', ...(entry.args || []))
			break
		case 'WARN':
			console.warn(message, entry.context?.metadata || '', ...(entry.args || []))
			break
		case 'ERROR':
			console.error(message, entry.context?.metadata || '', ...(entry.args || []))
			break
	}
}

/**
 * Core logging function - uses PostHog first, console as development fallback
 */
const logEntry = (entry: LogEntry) => {
	// Try PostHog first (production and development)
	const postHogSuccess = logToPostHog(entry)

	// In development, also log to console if PostHog failed or for immediate feedback
	if (isDevelopment() && (!postHogSuccess || entry.level === 'ERROR')) {
		developmentConsoleFallback(entry)
	}
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
