import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { LoggerService } from '../services/logger.service'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

interface ErrorResponse {
  statusCode: number
  message: string
  error: string
  timestamp: string
  path: string
  correlationId?: string
  details?: unknown
}

/**
 * Unified Error Handler
 * 
 * Single centralized error handling for the entire application.
 * Replaces: Multiple error interceptors, catch blocks, error handlers
 * Provides: Consistent error formatting, logging, and client responses
 */
@Injectable()
@Catch()
export class ErrorHandler implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    // Set context if logger exists and has the method
    if (this.logger && typeof this.logger.setContext === 'function') {
      this.logger.setContext('ErrorHandler')
    }
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    const errorResponse = this.buildErrorResponse(exception, request)
    
    // Log the error with appropriate context
    this.logError(exception, errorResponse, request)

    // Send response to client
    response
      .status(errorResponse.statusCode)
      .send(errorResponse)
  }

  private buildErrorResponse(exception: unknown, request: FastifyRequest): ErrorResponse {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let error = 'Internal Server Error'
    let details: unknown = undefined

    // Handle different error types
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const response = exception.getResponse()
      
      if (typeof response === 'object' && response !== null) {
        message = 'message' in response && typeof response.message === 'string' ? response.message : exception.message
        error = 'error' in response && typeof response.error === 'string' ? response.error : exception.name
        details = 'details' in response ? response.details : undefined
      } else {
        message = String(response)
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception)
      statusCode = prismaError.statusCode
      message = prismaError.message
      error = prismaError.error
      details = { code: exception.code, meta: exception.meta }
    } else if (exception instanceof Error) {
      message = exception.message
      error = exception.name
      
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        message = 'An unexpected error occurred'
        details = undefined
      } else {
        details = { stack: exception.stack }
      }
    }

    return {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url || '/',
      correlationId: request.context?.requestId || request.id,
      details
    }
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): {
    statusCode: number
    message: string
    error: string
  } {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          error: 'Duplicate Entry'
        }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'The requested record was not found',
          error: 'Not Found'
        }
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference: related record does not exist',
          error: 'Invalid Reference'
        }
      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid relation: constraint violation',
          error: 'Constraint Violation'
        }
      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database operation failed',
          error: 'Database Error'
        }
    }
  }

  private logError(exception: unknown, errorResponse: ErrorResponse, request: FastifyRequest & { user?: { id: string } }): void {
    const userId = request.user?.id
    const metadata = {
      url: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers?.['user-agent'] || 'unknown',
      correlationId: request.context?.requestId || request.id,
      statusCode: errorResponse.statusCode
    }

    // Log based on severity
    if (errorResponse.statusCode >= 500) {
      // Server errors - log as error
      if (exception instanceof Error) {
        this.logger.logError(exception, 'Request Handler', userId, metadata)
      } else {
        this.logger.error('Non-error exception thrown', String(exception))
      }
    } else if (errorResponse.statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(`Client error: ${errorResponse.message}`, 'Request Handler')
    }

    // Log security-related errors
    if (errorResponse.statusCode === 401 || errorResponse.statusCode === 403) {
      this.logger.warn(`Authentication failure - User: ${userId}, Path: ${request.url}, Status: ${errorResponse.statusCode}`)
    }
  }
}