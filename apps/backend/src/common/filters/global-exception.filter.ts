import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError, PrismaClientRustPanicError, PrismaClientInitializationError, PrismaClientValidationError } from '@repo/database'
import type { ControllerApiResponse, AppError } from '@repo/shared'

/**
 * Enhanced Global Exception Filter
 * 
 * This filter provides:
 * - Consistent error response format across all endpoints
 * - Detailed error handling for different exception types
 * - Security-aware error message sanitization
 * - Proper logging with correlation IDs
 * - Development vs production error detail levels
 * - Integration with monitoring systems
 */

interface ErrorContext {
  requestId?: string
  userId?: string
  path: string
  method: string
  timestamp: string
  userAgent?: string
  ip?: string
}

interface StructuredError {
  code: string
  message: string
  details?: Record<string, unknown>
  field?: string
  statusCode: number
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)
  private readonly isDevelopment = process.env.NODE_ENV === 'development'
  private readonly isProduction = process.env.NODE_ENV === 'production'

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<FastifyRequest>()
    const response = ctx.getResponse<FastifyReply>()

    const errorContext = this.buildErrorContext(request)
    const structuredError = this.processException(exception, errorContext)
    
    // Log the error with appropriate level
    this.logError(exception, structuredError, errorContext)
    
    // Send formatted response
    const errorResponse = this.buildErrorResponse(structuredError, errorContext)
    
    response
      .status(structuredError.statusCode)
      .send(errorResponse)
  }

  /**
   * Processes different types of exceptions into a structured format
   */
  private processException(exception: unknown, context: ErrorContext): StructuredError {
    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, context)
    }

    // Handle Zod validation errors
    if (exception instanceof ZodError) {
      return this.handleZodError(exception, context)
    }

    // Handle Prisma errors
    if (this.isPrismaError(exception)) {
      return this.handlePrismaError(exception as Record<string, unknown>, context)
    }

    // Handle other known error types
    if (exception instanceof Error) {
      return this.handleGenericError(exception, context)
    }

    // Handle unknown exceptions
    return this.handleUnknownException(exception, context)
  }

  /**
   * Handles NestJS HTTP exceptions
   */
  private handleHttpException(exception: HttpException, _context: ErrorContext): StructuredError {
    const status = exception.getStatus()
    const response = exception.getResponse()
    
    let message = exception.message
    let details: Record<string, unknown> | undefined = undefined
    let code = 'HTTP_EXCEPTION'

    // Handle structured error responses
    if (typeof response === 'object' && response !== null) {
      const errorObj = response as Record<string, unknown>
      
      if (errorObj.message) {
        message = Array.isArray(errorObj.message) 
          ? errorObj.message.join('; ') 
          : String(errorObj.message)
      }
      
      if (errorObj.errors && typeof errorObj.errors === 'object') {
        details = errorObj.errors as Record<string, unknown>
      }
      
      if (errorObj.code) {
        code = String(errorObj.code)
      }
    }

    return {
      code,
      message: this.sanitizeErrorMessage(message, status),
      details: this.isDevelopment ? details : undefined,
      statusCode: status
    }
  }

  /**
   * Handles Zod validation errors
   */
  private handleZodError(error: ZodError, _context: ErrorContext): StructuredError {
    const validationErrors = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
      received: 'received' in issue ? issue.received : undefined
    }))

    return {
      code: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      details: { errors: validationErrors },
      statusCode: HttpStatus.BAD_REQUEST
    }
  }

  /**
   * Handles Prisma database errors
   */
  private handlePrismaError(error: Record<string, unknown>, _context: ErrorContext): StructuredError {
    const { code, meta, message } = error

    switch (code) {
      case 'P2002':
        return {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: `Duplicate value for ${this.getMetaTarget(meta) || 'field'}`,
          details: this.isDevelopment ? { constraintField: this.getMetaTarget(meta) } : undefined,
          statusCode: HttpStatus.CONFLICT
        }

      case 'P2025':
        return {
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found',
          statusCode: HttpStatus.NOT_FOUND
        }

      case 'P2003':
        return {
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: 'Operation violates foreign key constraint',
          details: this.isDevelopment ? { field: this.getMetaFieldName(meta) } : undefined,
          statusCode: HttpStatus.BAD_REQUEST
        }

      case 'P2014':
        return {
          code: 'INVALID_ID',
          message: 'The provided ID is invalid',
          statusCode: HttpStatus.BAD_REQUEST
        }

      case 'P1001':
        return {
          code: 'DATABASE_CONNECTION_ERROR',
          message: 'Unable to connect to the database',
          statusCode: HttpStatus.SERVICE_UNAVAILABLE
        }

      case 'P1008':
        return {
          code: 'DATABASE_TIMEOUT',
          message: 'Database operation timed out',
          statusCode: HttpStatus.REQUEST_TIMEOUT
        }

      default:
        return {
          code: 'DATABASE_ERROR' as const,
          message: this.isProduction 
            ? 'A database error occurred' 
            : String(message) || 'Unknown database error',
          details: this.isDevelopment ? { prismaCode: code, meta } : undefined,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR
        }
    }
  }

  /**
   * Handles generic JavaScript errors
   */
  private handleGenericError(error: Error, _context: ErrorContext): StructuredError {
    // Check for specific error types
    if (error.name === 'ValidationError') {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      }
    }

    if (error.name === 'UnauthorizedError' || error.message.toLowerCase().includes('unauthorized')) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Access denied',
        statusCode: HttpStatus.UNAUTHORIZED
      }
    }

    if (error.name === 'ForbiddenError' || error.message.toLowerCase().includes('forbidden')) {
      return {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        statusCode: HttpStatus.FORBIDDEN
      }
    }

    if (error.name === 'NotFoundError' || error.message.toLowerCase().includes('not found')) {
      return {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        statusCode: HttpStatus.NOT_FOUND
      }
    }

    // Generic error handling
    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: this.isProduction 
        ? 'An internal server error occurred' 
        : error.message,
      details: this.isDevelopment ? { 
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 10) // Limit stack trace
      } : undefined,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR
    }
  }

  /**
   * Handles completely unknown exceptions
   */
  private handleUnknownException(exception: unknown, _context: ErrorContext): StructuredError {
    return {
      code: 'UNKNOWN_ERROR',
      message: this.isProduction 
        ? 'An unexpected error occurred' 
        : `Unknown exception: ${String(exception)}`,
      details: this.isDevelopment ? { exception: String(exception) } : undefined,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR
    }
  }

  /**
   * Builds error context from the request
   */
  private buildErrorContext(request: FastifyRequest): ErrorContext {
    return {
      requestId: request.headers['x-correlation-id'] as string,
      userId: (request as { user?: { id: string } }).user?.id,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      userAgent: request.headers['user-agent'],
      ip: request.ip
    }
  }

  /**
   * Builds the final error response
   */
  private buildErrorResponse(
    error: StructuredError, 
    context: ErrorContext
  ): ControllerApiResponse<null> {
    // Create proper AppError based on the error type
    const createAppError = (error: StructuredError): AppError => {
      const baseError = {
        name: error.code,
        message: error.message,
        statusCode: error.statusCode,
      }

      if (error.code.includes('VALIDATION') || error.statusCode === HttpStatus.BAD_REQUEST) {
        return {
          ...baseError,
          type: 'VALIDATION_ERROR' as const,
          code: 'VALIDATION_FAILED' as const,
          ...(error.field && { field: error.field })
        }
      } else if (error.code.includes('AUTH') || error.statusCode === HttpStatus.UNAUTHORIZED) {
        return {
          ...baseError,
          type: 'AUTH_ERROR' as const,
          code: 'UNAUTHORIZED' as const
        }
      } else if (error.code.includes('DATABASE') || error.code.includes('PRISMA')) {
        return {
          ...baseError,
          type: 'SERVER_ERROR' as const,
          code: 'DATABASE_ERROR' as const
        }
      } else {
        return {
          ...baseError,
          type: 'SERVER_ERROR' as const,
          code: 'INTERNAL_ERROR' as const
        }
      }
    }

    const response: ControllerApiResponse<null> = {
      success: false,
      data: null,
      message: error.message,
      error: createAppError(error),
      timestamp: new Date(context.timestamp),
      ...(context.requestId && { requestId: context.requestId })
    }

    // Add debug information in development
    if (this.isDevelopment) {
      (response as ControllerApiResponse<null> & { debug: unknown }).debug = {
        path: context.path,
        method: context.method,
        userId: context.userId
      }
    }

    return response
  }

  /**
   * Logs errors with appropriate detail level
   */
  private logError(
    exception: unknown,
    structuredError: StructuredError,
    context: ErrorContext
  ): void {
    const logContext = {
      requestId: context.requestId,
      userId: context.userId,
      path: context.path,
      method: context.method,
      userAgent: context.userAgent,
      ip: context.ip,
      errorCode: structuredError.code,
      statusCode: structuredError.statusCode
    }

    const logMessage = `${structuredError.code}: ${structuredError.message}`

    // Determine log level based on status code
    if (structuredError.statusCode >= 500) {
      this.logger.error(logMessage, {
        ...logContext,
        exception: this.isDevelopment ? exception : undefined,
        stack: exception instanceof Error ? exception.stack : undefined
      })
    } else if (structuredError.statusCode >= 400) {
      this.logger.warn(logMessage, logContext)
    } else {
      this.logger.log(logMessage, logContext)
    }

    // Additional logging for monitoring/alerting in production
    if (this.isProduction && structuredError.statusCode >= 500) {
      // Here you could integrate with external monitoring services
      // like Sentry, DataDog, etc.
      this.logger.error('PRODUCTION_ERROR_ALERT', {
        ...logContext,
        errorType: structuredError.code,
        timestamp: context.timestamp
      })
    }
  }

  /**
   * Sanitizes error messages to prevent information leakage
   */
  private sanitizeErrorMessage(message: string, statusCode: number): string {
    if (this.isDevelopment) {
      return message
    }

    // In production, sanitize sensitive information
    const sensitivePatterns = [
      /password/gi,
      /token/gi,
      /secret/gi,
      /key/gi,
      /email.*@/gi,
      /user.*id/gi
    ]

    let sanitized = message
    
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }

    // Provide generic messages for server errors in production
    if (statusCode >= 500) {
      return 'An internal server error occurred'
    }

    return sanitized
  }

  /**
   * Safely extracts target field from Prisma error meta
   */
  private getMetaTarget(meta: unknown): string | undefined {
    if (meta && typeof meta === 'object' && 'target' in meta) {
      return String((meta as Record<string, unknown>).target)
    }
    return undefined
  }

  /**
   * Safely extracts field_name from Prisma error meta
   */
  private getMetaFieldName(meta: unknown): string | undefined {
    if (meta && typeof meta === 'object' && 'field_name' in meta) {
      return String((meta as Record<string, unknown>).field_name)
    }
    return undefined
  }

  /**
   * Checks if an error is a Prisma error
   */
  private isPrismaError(exception: unknown): boolean {
    return exception instanceof PrismaClientKnownRequestError ||
           exception instanceof PrismaClientUnknownRequestError ||
           exception instanceof PrismaClientRustPanicError ||
           exception instanceof PrismaClientInitializationError ||
           exception instanceof PrismaClientValidationError ||
           Boolean((exception as Record<string, unknown>)?.code?.toString().startsWith('P'))
  }
}

/**
 * Development-specific exception filter with more detailed errors
 */
@Catch()
export class DevelopmentExceptionFilter extends GlobalExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    // Log full exception details in development
    console.error('🚨 Exception caught in development:', exception)
    
    if (exception instanceof Error && exception.stack) {
      console.error('📍 Stack trace:', exception.stack)
    }
    
    super.catch(exception, host)
  }
}

/**
 * Production-specific exception filter with minimal error exposure
 */
@Catch()
export class ProductionExceptionFilter extends GlobalExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    // In production, we might want to send errors to monitoring services
    // before processing them
    super.catch(exception, host)
  }
}