import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common'
import * as winston from 'winston'
import { ConfigService } from '@nestjs/config'

/**
 * Unified Logger Service
 * 
 * Single source of truth for all logging in the application.
 * Replaces: NestJS Logger, Winston implementations, custom loggers
 * Provides: Structured logging, performance tracking, security auditing
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private winston: winston.Logger
  private context?: string

  constructor(private configService: ConfigService) {
    const isDevelopment = this.configService.get('NODE_ENV') !== 'production'
    
    this.winston = winston.createLogger({
      level: this.configService.get('LOG_LEVEL', 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'tenantflow-backend',
        environment: this.configService.get('NODE_ENV', 'development')
      },
      transports: [
        // Console transport for all environments
        new winston.transports.Console({
          format: isDevelopment
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
              )
            : winston.format.json()
        }),
        // File transport for production
        ...(isDevelopment ? [] : [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
          })
        ])
      ]
    })
  }

  setContext(context: string): void {
    this.context = context
  }

  // NestJS LoggerService interface methods
  log(message: unknown, context?: string): void {
    this.winston.info(this.formatMessage(message), { context: context || this.context })
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.winston.error(this.formatMessage(message), {
      context: context || this.context,
      trace,
      stack: trace
    })
  }

  warn(message: unknown, context?: string): void {
    this.winston.warn(this.formatMessage(message), { context: context || this.context })
  }

  debug(message: unknown, context?: string): void {
    this.winston.debug(this.formatMessage(message), { context: context || this.context })
  }

  verbose(message: unknown, context?: string): void {
    this.winston.verbose(this.formatMessage(message), { context: context || this.context })
  }

  // Extended logging methods
  
  /**
   * Log HTTP request
   */
  logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
    this.winston.info('HTTP Request', {
      type: 'http',
      method,
      url,
      statusCode,
      duration,
      userId,
      context: 'HTTP'
    })
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    const level = duration > 1000 ? 'warn' : 'info'
    this.winston.log(level, 'Performance metric', {
      type: 'performance',
      operation,
      duration,
      slow: duration > 1000,
      ...metadata,
      context: 'Performance'
    })
  }

  /**
   * Log security events
   */
  logSecurity(eventType: string, userId?: string, details?: unknown): void {
    const level = this.getSecurityLogLevel(eventType)
    this.winston.log(level, 'Security event', {
      type: 'security',
      eventType,
      userId,
      details,
      timestamp: new Date().toISOString(),
      context: 'Security'
    })
  }

  /**
   * Log business audit events
   */
  logAudit(action: string, entityType: string, entityId: string, userId: string, changes?: unknown): void {
    this.winston.info('Audit event', {
      type: 'audit',
      action,
      entityType,
      entityId,
      userId,
      changes,
      timestamp: new Date().toISOString(),
      context: 'Audit'
    })
  }

  /**
   * Log errors with structured format
   */
  logError(error: Error, context?: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.winston.error('Application error', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      name: error.name,
      context: context || this.context,
      userId,
      ...metadata
    })
  }

  /**
   * Log with custom metadata
   */
  logWithMetadata(level: string, message: string, metadata?: Record<string, unknown>): void {
    this.winston.log(level, message, {
      ...metadata,
      context: this.context
    })
  }

  // Helper methods

  private formatMessage(message: unknown): string {
    if (typeof message === 'object') {
      return JSON.stringify(message)
    }
    return String(message)
  }

  private getSecurityLogLevel(eventType: string): string {
    // Map common security event types to log levels
    const eventLower = eventType.toLowerCase()
    if (eventLower.includes('failure') || eventLower.includes('denied') || eventLower.includes('suspicious')) {
      return 'warn'
    }
    if (eventLower.includes('breach') || eventLower.includes('brute') || eventLower.includes('attack')) {
      return 'error'
    }
    return 'info'
  }
}