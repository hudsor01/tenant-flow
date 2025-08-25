import { Injectable, Inject } from '@nestjs/common'
import type { FastifyBaseLogger } from 'fastify'
import { REQUEST } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'

/**
 * Pino Logger Service - Native Fastify Integration
 * Uses Fastify's built-in Pino logger (no abstractions)
 */
@Injectable()
export class LoggerService {
  private logger: FastifyBaseLogger

  constructor(@Inject(REQUEST) private readonly request?: FastifyRequest) {
    // Use request logger with correlation ID if available, otherwise use root logger
    this.logger = this.request?.log ?? this.getRootLogger()
  }

  /**
   * Get root logger for bootstrap and non-request contexts
   */
  private getRootLogger(): FastifyBaseLogger {
    // Fallback logger for bootstrap - will be replaced by Fastify logger once available
    return {
      info: console.log,
      warn: console.warn,  
      error: console.error,
      debug: console.debug,
      trace: console.trace,
      fatal: console.error
    } as FastifyBaseLogger
  }

  /**
   * Log info message
   */
  log(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.info(context, message)
    } else {
      this.logger.info(message)
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.warn(context, message)
    } else {
      this.logger.warn(message)
    }
  }

  /**
   * Log error message
   */
  error(message: string, errorOrContext?: unknown): void {
    if (errorOrContext instanceof Error) {
      this.logger.error({ err: errorOrContext }, message)
    } else if (errorOrContext && typeof errorOrContext === 'object') {
      this.logger.error(errorOrContext as Record<string, unknown>, message)
    } else {
      this.logger.error(message)
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.debug(context, message)
    } else {
      this.logger.debug(message)
    }
  }

  /**
   * Log trace message  
   */
  trace(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.trace(context, message)
    } else {
      this.logger.trace(message)
    }
  }

  /**
   * Log fatal message
   */
  fatal(message: string, errorOrContext?: unknown): void {
    if (errorOrContext instanceof Error) {
      this.logger.fatal({ err: errorOrContext }, message)
    } else if (errorOrContext && typeof errorOrContext === 'object') {
      this.logger.fatal(errorOrContext as Record<string, unknown>, message)
    } else {
      this.logger.fatal(message)
    }
  }

  /**
   * Create child logger with additional context
   */
  child(bindings: Record<string, unknown>): LoggerService {
    const childLogger = this.logger.child(bindings)
    const childService = new LoggerService()
    ;(childService as any).logger = childLogger
    return childService
  }
}