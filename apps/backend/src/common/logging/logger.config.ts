/**
 * Logger Configuration
 * 
 * Centralized logging configuration for the backend application.
 * Provides structured logging with proper formatting and levels.
 */

import type { LoggerService, LogLevel } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import * as winston from 'winston'
import { APP_CONFIG } from '../../shared/constants/app-config'

const getLogLevels = (): LogLevel[] => {
	if (APP_CONFIG.IS_PRODUCTION) {
		return ['error', 'warn', 'log']
	}
	if (APP_CONFIG.IS_TEST) {
		return ['error']
	}
	return ['error', 'warn', 'log', 'debug', 'verbose']
}

const customFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.errors({ stack: true }),
	winston.format.splat(),
	winston.format.json(),
	winston.format.printf(({ timestamp, level, message, context, ...meta }: winston.Logform.TransformableInfo) => {
		const logObject = {
			timestamp,
			level,
			message,
			context,
			...meta
		}
		return JSON.stringify(logObject)
	})
)

let runningPort: number | null = null

export function setRunningPort(port: number): void {
	runningPort = port
}

const customConsoleFormat = winston.format.combine(
	winston.format.timestamp({ format: 'HH:mm:ss' }),
	winston.format.ms(),
	winston.format.printf(({ timestamp, level, message, context, ms }) => {
		const pid = process.pid
		const port = runningPort || '????'
		const contextStr = context ? `[${context}]` : ''
		const colorLevel = winston.format.colorize().colorize(level, level.toUpperCase())
		
		return `[Nest] ${pid}:${port}  - ${timestamp}  ${colorLevel} ${contextStr} ${message} ${ms || ''}`
	})
)

const consoleFormat = winston.format.combine(
	winston.format.timestamp({ format: 'HH:mm:ss' }),
	winston.format.ms(),
	winston.format.errors({ stack: true }),
	customConsoleFormat
)

export function createLogger(): LoggerService {
	const transports: winston.transport[] = []

	transports.push(
		new winston.transports.Console({
			format: APP_CONFIG.IS_PRODUCTION ? customFormat : consoleFormat
		})
	)

	if (APP_CONFIG.IS_PRODUCTION) {
		transports.push(
			new winston.transports.File({
				filename: 'logs/error.log',
				level: 'error',
				format: customFormat,
				maxsize: 5242880,
				maxFiles: 5
			})
		)
		transports.push(
			new winston.transports.File({
				filename: 'logs/combined.log',
				format: customFormat,
				maxsize: 5242880,
				maxFiles: 5
			})
		)
	}

	return WinstonModule.createLogger({
		level: APP_CONFIG.IS_PRODUCTION ? 'info' : 'debug',
		format: customFormat,
		transports,
		exitOnError: false
	})
}

/**
 * Logger context helper
 * Adds consistent context to log entries
 */
export class LogContext {
	static create(operation: string, resource: string, userId?: string): Record<string, unknown> {
		return {
			operation,
			resource,
			userId,
			timestamp: new Date().toISOString(),
			environment: process.env.NODE_ENV
		}
	}
}

/**
 * Performance logger helper
 * Tracks operation duration
 */
export class PerformanceLogger {
	private startTime: number

	constructor(
		private logger: LoggerService,
		private operation: string,
		private context?: Record<string, unknown>
	) {
		this.startTime = Date.now()
		if ('debug' in this.logger && typeof this.logger.debug === 'function') {
			this.logger.debug(`Starting ${operation}`, { ...this.context, phase: 'start' })
		} else {
			this.logger.log(`Starting ${operation}`, { ...this.context, phase: 'start' })
		}
	}

	complete(additionalContext?: Record<string, unknown>): void {
		const duration = Date.now() - this.startTime
		this.logger.log(`Completed ${this.operation}`, {
			...this.context,
			...additionalContext,
			duration,
			phase: 'complete'
		})
	}

	error(error: Error, additionalContext?: Record<string, unknown>): void {
		const duration = Date.now() - this.startTime
		this.logger.error(`Failed ${this.operation}`, {
			...this.context,
			...additionalContext,
			duration,
			phase: 'error',
			error: {
				message: error.message,
				stack: error.stack,
				name: error.name
			}
		})
	}
}

/**
 * Audit logger for sensitive operations
 */
export class AuditLogger {
	constructor(private logger: LoggerService) {}

	logAccess(resource: string, action: string, userId: string, metadata?: Record<string, unknown>): void {
		this.logger.log('Audit: Resource accessed', {
			audit: true,
			resource,
			action,
			userId,
			metadata,
			timestamp: new Date().toISOString()
		})
	}

	logModification(
		resource: string,
		action: 'create' | 'update' | 'delete',
		userId: string,
		before?: unknown,
		after?: unknown
	): void {
		this.logger.log('Audit: Resource modified', {
			audit: true,
			resource,
			action,
			userId,
			changes: { before, after },
			timestamp: new Date().toISOString()
		})
	}

	logSecurityEvent(event: string, userId: string, metadata?: Record<string, unknown>): void {
		this.logger.warn('Audit: Security event', {
			audit: true,
			security: true,
			event,
			userId,
			metadata,
			timestamp: new Date().toISOString()
		})
	}
}

export const LOG_LEVELS = getLogLevels()