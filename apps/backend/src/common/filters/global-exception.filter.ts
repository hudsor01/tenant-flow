import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { PrismaClientKnownRequestError } from '@repo/database'
import { ErrorHandlerService } from '../errors/error-handler.service'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  constructor(_errorHandler: ErrorHandlerService) {
    // ErrorHandler service available for enhanced error processing
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest()

    const { status, errorResponse } = this.processException(exception, request)

    // Log the error with request context
    this.logError(exception, request, status)

    // Send standardized error response
    response.status(status).send(errorResponse)
  }

  private processException(exception: unknown, request: { url: string; method: string }): {
    status: number
    errorResponse: { error: { message: string; code: string; statusCode: number; timestamp: string; path: string; method: string; [key: string]: unknown } }
  } {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      code = this.getErrorCodeFromStatus(status);

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const responseObject = response as { message: string | string[], error?: string, statusCode?: number, [key: string]: unknown };
        message = Array.isArray(responseObject.message) ? responseObject.message.join(', ') : responseObject.message;
        if (responseObject.error) {
            code = responseObject.error.toUpperCase().replace(/ /g, '_');
        }
        details = { ...responseObject };
        delete details.message;
        delete details.error;
        delete details.statusCode;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.errorResponse.message;
      code = prismaError.errorResponse.code;
      details = (prismaError.errorResponse as { details?: Record<string, unknown> }).details || {};
    } else if (exception instanceof Error) {
      message = exception.message;
      const customError = exception as Error & { 
        code?: string; 
        type?: string; 
        field?: string;
        [key: string]: unknown;
      };
      
      if (customError.code) {
        code = customError.code;
        status = this.getStatusFromErrorCode(code);
        
        // If code doesn't map to a specific status, check type as fallback
        if (status === HttpStatus.INTERNAL_SERVER_ERROR && customError.type) {
          status = this.getStatusFromErrorCode(customError.type);
        }
      }
      
      // Copy additional custom error properties to details
      const errorKeys = Object.keys(customError);
      for (const key of errorKeys) {
        if (key !== 'message' && key !== 'stack' && key !== 'name') {
          details[key] = customError[key];
        }
      }
    }

    const errorResponse = {
      error: {
        message,
        code,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...details
      }
    };

    return { status, errorResponse };
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): {
    status: number
    errorResponse: { message: string; code: string; statusCode: number; [key: string]: unknown }
  } {
    let status = HttpStatus.BAD_REQUEST
    let message = 'Database error'
    let code = 'DATABASE_ERROR'

    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        status = HttpStatus.CONFLICT
        code = 'RESOURCE_ALREADY_EXISTS'
        const target = error.meta?.target as string[]
        message = `A record with this ${target?.join(', ') || 'value'} already exists`
        break
      }

      case 'P2025':
        // Record not found
        status = HttpStatus.NOT_FOUND
        code = 'RESOURCE_NOT_FOUND'
        message = 'The requested record was not found'
        break

      case 'P2003':
        // Foreign key constraint violation
        status = HttpStatus.BAD_REQUEST
        code = 'INVALID_REFERENCE'
        message = 'Referenced record does not exist'
        break

      case 'P2014':
        // Invalid ID
        status = HttpStatus.BAD_REQUEST
        code = 'INVALID_INPUT'
        message = 'Invalid ID provided'
        break

      case 'P2021':
        // Table does not exist
        status = HttpStatus.INTERNAL_SERVER_ERROR
        code = 'DATABASE_SCHEMA_ERROR'
        message = 'Database schema error'
        break

      case 'P2022':
        // Column does not exist
        status = HttpStatus.INTERNAL_SERVER_ERROR
        code = 'DATABASE_SCHEMA_ERROR'
        message = 'Database schema error'
        break

      default:
        this.logger.error(`Unhandled Prisma error: ${error.code}`, error.message)
        status = HttpStatus.INTERNAL_SERVER_ERROR
        code = 'DATABASE_ERROR'
        message = 'A database error occurred'
    }

    return {
      status,
      errorResponse: {
        message,
        code,
        statusCode: status,
        details: {
          prismaCode: error.code,
          meta: error.meta
        }
      }
    }
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST'
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED'
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN'
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND'
      case HttpStatus.CONFLICT:
        return 'CONFLICT'
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY'
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED'
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_SERVER_ERROR'
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE'
      default:
        return 'UNKNOWN_ERROR'
    }
  }

  private getStatusFromErrorCode(code: string): number {
    switch (code) {
      case 'BAD_REQUEST':
      case 'VALIDATION_ERROR':
      case 'BUSINESS_ERROR':
      case 'INVALID_INPUT':
        return HttpStatus.BAD_REQUEST
      case 'UNAUTHORIZED':
      case 'INVALID_CREDENTIALS':
      case 'TOKEN_EXPIRED':
      case 'INVALID_TOKEN':
        return HttpStatus.UNAUTHORIZED
      case 'FORBIDDEN':
      case 'INSUFFICIENT_PERMISSIONS':
      case 'PERMISSION_ERROR':
        return HttpStatus.FORBIDDEN
      case 'NOT_FOUND':
      case 'RESOURCE_NOT_FOUND':
      case 'NOT_FOUND_ERROR':
        return HttpStatus.NOT_FOUND
      case 'CONFLICT':
      case 'RESOURCE_ALREADY_EXISTS':
        return HttpStatus.CONFLICT
      case 'UNPROCESSABLE_ENTITY':
        return HttpStatus.UNPROCESSABLE_ENTITY
      case 'PAYMENT_REQUIRED':
      case 'PAYMENT_FAILED':
      case 'SUBSCRIPTION_REQUIRED':
        return HttpStatus.PAYMENT_REQUIRED
      case 'RATE_LIMIT_EXCEEDED':
        return HttpStatus.TOO_MANY_REQUESTS
      case 'SERVICE_UNAVAILABLE':
        return HttpStatus.SERVICE_UNAVAILABLE
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR
    }
  }

  private logError(exception: unknown, request: { method: string; url: string; ip: string; headers: Record<string, string | undefined>; user?: { id: string } }, status: number): void {
    const { method, url, ip, headers } = request
    const userAgent = headers['user-agent'] || 'unknown'
    const userId = request.user?.id || 'anonymous'

    const logContext = {
      method,
      url,
      ip,
      userAgent,
      userId,
      status,
      timestamp: new Date().toISOString()
    }

    if (exception instanceof Error) {
      this.logger.error(
        `${exception.constructor.name}: ${exception.message}`,
        {
          ...logContext,
          stack: exception.stack,
          ...(exception instanceof HttpException && {
            response: exception.getResponse()
          })
        }
      )
    } else {
      this.logger.error(
        `Unknown exception: ${String(exception)}`,
        logContext
      )
    }

    // Log to external monitoring service if configured
    if (status >= 500) {
      this.logToMonitoringService(exception, logContext)
    }
  }

  private logToMonitoringService(_exception: unknown, context: { method: string; url: string; ip: string; userAgent: string; userId: string; status: number; timestamp: string }): void {
    // Integration with external monitoring services like Sentry, DataDog, etc.
    // This can be implemented based on your monitoring setup
    try {
      // Example: Sentry integration
      // Sentry.captureException(exception, { extra: context })
      
      // Example: Custom monitoring webhook
      // await this.monitoringService.reportError(exception, context)
      
      this.logger.debug('Error logged to monitoring service', context)
    } catch (error) {
      this.logger.warn('Failed to log to monitoring service', error)
    }
  }
}