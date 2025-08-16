import {
	Injectable,
	LoggerService as NestLoggerService,
	Scope
} from '@nestjs/common'
import * as winston from 'winston'
import 'winston-daily-rotate-file'
import { TypeSafeConfigService } from '../config/config.service'
import { ILogger, LogContext } from '@repo/shared'

/**
 * Unified Logger Service
 *
 * Single source of truth for all logging in the application.
 * Consolidates and replaces:
 * - StructuredLoggerService
 * - LoggerService (common/services)
 * - winston.config.ts utilities
 * - logger.config.ts utilities
 * - Direct NestJS Logger usage
 *
 * Features:
 * - Winston-based structured logging
 * - Environment-aware configuration
 * - NestJS LoggerService interface compliance
 * - Shared interface compliance (ILogger)
 * - Performance tracking capabilities
 * - Security audit logging
 * - Request correlation IDs
 * - Structured context data
 */
@Injectable({ scope: Scope.TRANSIENT })
export class UnifiedLoggerService implements NestLoggerService, ILogger {
	private winston: winston.Logger
	private context?: string
	private correlationId?: string

	constructor(private readonly configService: TypeSafeConfigService) {
		this.winston = this.createWinstonLogger()
	}

	/**
	 * Create Winston logger with environment-aware configuration
	 */
	private createWinstonLogger(): winston.Logger {
		const isProduction = this.configService.isProduction
		const isDevelopment = this.configService.isDevelopment
		const isRailway = !!process.env.RAILWAY_ENVIRONMENT

		// Base format for all environments
		const baseFormat = winston.format.combine(
			winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
			winston.format.errors({ stack: true }),
			winston.format.metadata({
				fillExcept: ['message', 'level', 'timestamp', 'context']
			})
		)

		// Production format - structured JSON
		const productionFormat = winston.format.combine(
			baseFormat,
			winston.format.json()
		)

		// Development format - human readable with colors
		const developmentFormat = winston.format.combine(
			baseFormat,
			winston.format.colorize({ all: true }),
			winston.format.printf(
				({
					timestamp,
					level,
					message,
					context,
					correlationId,
					metadata,
					stack
				}) => {
					const contextStr = context ? `[${context}]` : '[App]'
					const corrStr =
						correlationId && typeof correlationId === 'string'
							? ` (${correlationId.slice(0, 8)})`
							: ''
					const metaStr =
						metadata && Object.keys(metadata).length > 0
							? ` ${JSON.stringify(metadata)}`
							: ''

					let formatted = `${timestamp} ${contextStr}${corrStr} ${level}: ${message}${metaStr}`

					if (stack) {
						formatted += `\n${stack}`
					}

					return formatted
				}
			)
		)

		// Configure transports based on environment
		const transports: winston.transport[] = []

		if (isProduction) {
			// Production: Always add console (for Docker/Railway logs)
			transports.push(
				new winston.transports.Console({
					level: 'info',
					format: productionFormat
				})
			)

			// Add file transports only if not in Docker/Railway (local production)
			if (!isRailway && !process.env.DOCKER_CONTAINER) {
				const logDir = process.cwd() + '/logs'

				// Application logs with rotation
				transports.push(
					new winston.transports.DailyRotateFile({
						filename: `${logDir}/app-%DATE%.log`,
						datePattern: 'YYYY-MM-DD',
						zippedArchive: true,
						maxSize: '20m',
						maxFiles: '14d',
						level: 'info',
						format: productionFormat
					})
				)

				// Error logs with longer retention
				transports.push(
					new winston.transports.DailyRotateFile({
						filename: `${logDir}/error-%DATE%.log`,
						datePattern: 'YYYY-MM-DD',
						zippedArchive: true,
						maxSize: '20m',
						maxFiles: '30d',
						level: 'error',
						format: productionFormat
					})
				)
			}
		} else {
			// Development: Console with colors and debug level
			transports.push(
				new winston.transports.Console({
					level: 'debug',
					format: developmentFormat
				})
			)
		}

		return winston.createLogger({
			level:
				this.configService.get('LOG_LEVEL') ||
				(isDevelopment ? 'debug' : 'info'),
			format: isProduction ? productionFormat : developmentFormat,
			defaultMeta: {
				service: 'tenantflow-backend',
				environment: this.configService.config.NODE_ENV,
				platform: isRailway
					? 'Railway'
					: process.env.VERCEL
						? 'Vercel'
						: 'Local',
				version: process.env.npm_package_version || '1.0.0'
			},
			transports,
			// Handle uncaught exceptions and rejections
			exceptionHandlers: isProduction
				? [
						new winston.transports.Console({
							format: productionFormat
						})
					]
				: undefined,
			rejectionHandlers: isProduction
				? [
						new winston.transports.Console({
							format: productionFormat
						})
					]
				: undefined,
			exitOnError: false
		})
	}

	// ========================================================================
	// CONTEXT MANAGEMENT
	// ========================================================================

	/**
	 * Set logger context (service/class name)
	 */
	setContext(context: string): void {
		this.context = context
	}

	/**
	 * Set correlation ID for request tracking
	 */
	setCorrelationId(correlationId: string): void {
		this.correlationId = correlationId
	}

	/**
	 * Get current context
	 */
	getContext(): string | undefined {
		return this.context
	}

	// ========================================================================
	// NESTJS LOGGERSERVICE INTERFACE
	// ========================================================================

	log(message: unknown, context?: string): void {
		this.winston.info(this.formatMessage(message), this.buildMeta(context))
	}

	error(
		message: unknown,
		trace?: string | Error,
		context?: string | LogContext
	): void {
		const meta =
			typeof context === 'string'
				? this.buildMeta(context)
				: { ...this.buildMeta(), ...context }
		this.winston.error(this.formatMessage(message), {
			...meta,
			stack: trace instanceof Error ? trace.stack : trace
		})
	}

	warn(message: unknown, context?: string | LogContext): void {
		const meta =
			typeof context === 'string'
				? this.buildMeta(context)
				: { ...this.buildMeta(), ...context }
		this.winston.warn(this.formatMessage(message), meta)
	}

	debug(message: unknown, context?: string | LogContext): void {
		const meta =
			typeof context === 'string'
				? this.buildMeta(context)
				: { ...this.buildMeta(), ...context }
		this.winston.debug(this.formatMessage(message), meta)
	}

	verbose(message: unknown, context?: string): void {
		this.winston.verbose(
			this.formatMessage(message),
			this.buildMeta(context)
		)
	}

	// ========================================================================
	// SHARED ILOGGER INTERFACE
	// ========================================================================

	info(message: string, context?: LogContext): void {
		this.winston.info(message, {
			...this.buildMeta(),
			...context
		})
	}

	// ========================================================================
	// EXTENDED LOGGING METHODS
	// ========================================================================

	/**
	 * Log HTTP requests with performance data
	 */
	logRequest(
		method: string,
		url: string,
		statusCode: number,
		duration: number,
		userId?: string,
		userAgent?: string
	): void {
		this.winston.info('HTTP Request', {
			...this.buildMeta('HTTP'),
			type: 'http_request',
			method,
			url,
			statusCode,
			duration,
			userId,
			userAgent
		})
	}

	/**
	 * Log database operations for monitoring
	 */
	logDatabaseOperation(
		operation: string,
		table: string,
		duration: number,
		recordCount?: number,
		error?: Error
	): void {
		const level = error ? 'error' : 'debug'
		const message = error
			? `Database operation failed: ${operation}`
			: `Database operation: ${operation}`

		this.winston.log(level, message, {
			...this.buildMeta('Database'),
			type: 'database_operation',
			operation,
			table,
			duration,
			recordCount,
			error: error
				? {
						message: error.message,
						stack: error.stack
					}
				: undefined
		})
	}

	/**
	 * Log security events for audit trail
	 */
	logSecurityEvent(
		event: string,
		userId?: string,
		ipAddress?: string,
		userAgent?: string,
		additional?: Record<string, unknown>
	): void {
		this.winston.warn('Security Event', {
			...this.buildMeta('Security'),
			type: 'security_event',
			event,
			userId,
			ipAddress,
			userAgent,
			timestamp: new Date().toISOString(),
			...additional
		})
	}

	/**
	 * Log performance metrics
	 */
	logPerformance(
		operation: string,
		duration: number,
		success: boolean,
		metadata?: Record<string, unknown>
	): void {
		this.winston.info('Performance Metric', {
			...this.buildMeta('Performance'),
			type: 'performance',
			operation,
			duration,
			success,
			...metadata
		})
	}

	/**
	 * Log business events for analytics
	 */
	logBusinessEvent(
		event: string,
		entityType: string,
		entityId: string,
		userId?: string,
		metadata?: Record<string, unknown>
	): void {
		this.winston.info('Business Event', {
			...this.buildMeta('Business'),
			type: 'business_event',
			event,
			entityType,
			entityId,
			userId,
			timestamp: new Date().toISOString(),
			...metadata
		})
	}

	/**
	 * Log external API calls
	 */
	logExternalAPI(
		service: string,
		endpoint: string,
		method: string,
		statusCode: number,
		duration: number,
		error?: Error
	): void {
		const level = error || statusCode >= 400 ? 'error' : 'debug'
		const message = error
			? `External API call failed: ${service}`
			: `External API call: ${service}`

		this.winston.log(level, message, {
			...this.buildMeta('ExternalAPI'),
			type: 'external_api',
			service,
			endpoint,
			method,
			statusCode,
			duration,
			error: error
				? {
						message: error.message,
						stack: error.stack
					}
				: undefined
		})
	}

	// ========================================================================
	// UTILITY METHODS
	// ========================================================================

	/**
	 * Format message to string
	 */
	private formatMessage(message: unknown): string {
		if (typeof message === 'string') {
			return message
		}
		if (message instanceof Error) {
			return message.message
		}
		return JSON.stringify(message)
	}

	/**
	 * Build metadata object with context and correlation ID
	 */
	private buildMeta(context?: string): Record<string, unknown> {
		const meta: Record<string, unknown> = {}

		if (context || this.context) {
			meta.context = context || this.context
		}

		if (this.correlationId) {
			meta.correlationId = this.correlationId
		}

		return meta
	}

	/**
	 * Create child logger with specific context
	 */
	child(context: string): UnifiedLoggerService {
		const childLogger = new UnifiedLoggerService(this.configService)
		childLogger.setContext(context)
		if (this.correlationId) {
			childLogger.setCorrelationId(this.correlationId)
		}
		return childLogger
	}

	/**
	 * Get logger configuration summary for debugging
	 */
	getConfigSummary(): Record<string, unknown> {
		return {
			level: this.winston.level,
			transports: this.winston.transports.length,
			environment: this.configService.config.NODE_ENV,
			isProduction: this.configService.isProduction,
			isRailway: !!process.env.RAILWAY_ENVIRONMENT,
			context: this.context,
			hasCorrelationId: !!this.correlationId
		}
	}
}
