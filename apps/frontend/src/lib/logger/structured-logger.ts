import { ILogger, LogContext, AnalyticsEvent } from '@repo/shared'

/**
 * Frontend Structured Logger
 * Replaces all console.log statements with proper structured logging
 * Handles development vs production logging appropriately
 */
class FrontendLogger implements ILogger {
	private readonly isDevelopment: boolean
	private readonly isTest: boolean

	constructor() {
		this.isDevelopment = process.env.NODE_ENV === 'development'
		this.isTest = process.env.NODE_ENV === 'test'
	}

	/**
	 * Debug level logging - only in development
	 */
	debug(message: string, context?: LogContext): void {
		if (this.isDevelopment && !this.isTest) {
			console.debug(`[DEBUG] ${message}`, context)
		}
	}

	/**
	 * Info level logging
	 */
	info(message: string, context?: LogContext): void {
		if (this.isDevelopment && !this.isTest) {
			console.info(`[INFO] ${message}`, context)
		}

		// Send to analytics in production
		if (!this.isDevelopment && !this.isTest) {
			this.sendToAnalytics('info', message, context)
		}
	}

	/**
	 * Warning level logging
	 */
	warn(message: string, context?: LogContext): void {
		if (this.isDevelopment && !this.isTest) {
			console.warn(`[WARN] ${message}`, context)
		}

		// Always send warnings to analytics
		if (!this.isTest) {
			this.sendToAnalytics('warn', message, context)
		}
	}

	/**
	 * Error level logging
	 */
	error(message: string, error?: Error, context?: LogContext): void {
		if (this.isDevelopment && !this.isTest) {
			console.error(`[ERROR] ${message}`, error, context)
		}

		// Always send errors to analytics
		if (!this.isTest) {
			this.sendToAnalytics('error', message, {
				...context,
				error: error?.message,
				stack: error?.stack
			})
		}
	}

	/**
	 * Log user actions for analytics
	 */
	userAction(action: string, context?: LogContext): void {
		this.info(`User Action: ${action}`, context)

		if (!this.isTest) {
			this.sendToAnalytics('user_action', action, context)
		}
	}

	/**
	 * Log performance metrics
	 */
	performance(
		operation: string,
		duration: number,
		context?: LogContext
	): void {
		const message = `Performance: ${operation} took ${duration}ms`

		if (duration > 1000) {
			this.warn(message, { ...context, duration, operation })
		} else {
			this.info(message, { ...context, duration, operation })
		}
	}

	/**
	 * Log API calls
	 */
	apiCall(
		method: string,
		url: string,
		status: number,
		duration: number,
		context?: LogContext
	): void {
		const message = `API: ${method} ${url} ${status}`
		const apiContext = {
			...context,
			method,
			url,
			status,
			duration
		}

		if (status >= 400) {
			this.error(message, undefined, apiContext)
		} else if (status >= 300) {
			this.warn(message, apiContext)
		} else {
			this.info(message, apiContext)
		}
	}

	/**
	 * Send events to analytics service
	 */
	private sendToAnalytics(
		level: string,
		message: string,
		context?: LogContext
	): void {
		try {
			// PostHog integration
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if (typeof window !== 'undefined' && (window as any).posthog) {
				const event: AnalyticsEvent = {
					event: 'log_event',
					properties: {
						level,
						message,
						timestamp: new Date().toISOString(),
						url: window.location.href,
						userAgent: navigator.userAgent,
						...context
					},
					userId: context?.userId
				}

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				;(window as any).posthog.capture(event.event, event.properties)
			}

			// Sentry integration for errors
			if (
				level === 'error' &&
				typeof window !== 'undefined' &&
				(window as unknown as { Sentry?: unknown }).Sentry
			) {
				const sentry = (window as unknown as { Sentry: { captureMessage: (msg: string, opts: { level: string; extra: LogContext }) => void } }).Sentry
				sentry.captureMessage(message, {
					level: 'error',
					extra: context
				})
			}
		} catch (analyticsError) {
			// Silently fail analytics - don't break the app
			if (this.isDevelopment) {
				console.warn('Analytics logging failed:', analyticsError)
			}
		}
	}

	/**
	 * Create a child logger with additional context
	 */
	child(context: LogContext): FrontendLogger {
		const childLogger = new FrontendLogger()
		// Store context for future use
		;(childLogger as unknown as { defaultContext: LogContext }).defaultContext = context
		return childLogger
	}

	/**
	 * Log component lifecycle events
	 */
	component(
		name: string,
		event: 'mount' | 'unmount' | 'render' | 'error',
		context?: LogContext
	): void {
		this.debug(`Component ${name}: ${event}`, {
			...context,
			component: name,
			event
		})
	}

	/**
	 * Log route changes
	 */
	route(from: string, to: string, context?: LogContext): void {
		this.info(`Route change: ${from} → ${to}`, {
			...context,
			from,
			to,
			navigation: true
		})
	}
}

// Export singleton instance
export const logger = new FrontendLogger()

// Export class for testing
export { FrontendLogger }
