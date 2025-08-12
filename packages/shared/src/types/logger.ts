/**
 * Comprehensive Logger types shared between frontend and backend
 * Replaces all console.log statements with structured logging
 */

/**
 * Log levels for application logging
 */
export const LogLevel = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3
} as const

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]

/**
 * Log context for structured logging
 */
export interface LogContext {
	userId?: string
	requestId?: string
	component?: string
	action?: string
	duration?: number
	statusCode?: number
	userAgent?: string
	ip?: string
	[key: string]: unknown
}

/**
 * Log entry structure
 */
export interface LogEntry {
	level: LogLevel
	message: string
	timestamp: string
	context?: LogContext
	error?: Error
}

/**
 * Logger interface for consistent logging across frontend and backend
 */
export interface ILogger {
	debug(message: string, context?: LogContext): void
	info(message: string, context?: LogContext): void
	warn(message: string, context?: LogContext): void
	error(message: string, error?: Error, context?: LogContext): void
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
	level: LogLevel
	enableConsole?: boolean
	enableFile?: boolean
	enableAnalytics?: boolean
	maxFileSize?: number
	maxFiles?: number
	environment?: 'development' | 'production' | 'test'
}

/**
 * Analytics event for logging
 */
export interface AnalyticsEvent {
	event: string
	properties: Record<string, unknown>
	userId?: string
	timestamp?: string
}
