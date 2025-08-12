/**
 * Frontend Logger Module
 * Centralized logging for the frontend application
 * Replaces all console.log statements with structured logging
 */

import { logger as loggerInstance } from './structured-logger'

export { logger, FrontendLogger } from './structured-logger'
export type { ILogger, LogContext } from '@repo/shared'
import type { LogContext } from '@repo/shared'

// Re-export for convenience
export const log = {
	debug: (message: string, context?: LogContext) =>
		loggerInstance.debug(message, context),
	info: (message: string, context?: LogContext) =>
		loggerInstance.info(message, context),
	warn: (message: string, context?: LogContext) =>
		loggerInstance.warn(message, context),
	error: (message: string, error?: Error, context?: LogContext) =>
		loggerInstance.error(message, error, context),
	userAction: (action: string, context?: LogContext) =>
		loggerInstance.userAction(action, context),
	performance: (operation: string, duration: number, context?: LogContext) =>
		loggerInstance.performance(operation, duration, context),
	apiCall: (
		method: string,
		url: string,
		status: number,
		duration: number,
		context?: LogContext
	) => loggerInstance.apiCall(method, url, status, duration, context),
	component: (
		name: string,
		event: 'mount' | 'unmount' | 'render' | 'error',
		context?: LogContext
	) => loggerInstance.component(name, event, context),
	route: (from: string, to: string, context?: LogContext) =>
		loggerInstance.route(from, to, context)
}
