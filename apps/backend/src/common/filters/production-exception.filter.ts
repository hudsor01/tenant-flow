import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'

interface SanitizedError {
  statusCode: number
  message: string
  error: string
  timestamp: string
  path: string
  requestId?: string
}

@Catch()
export class ProductionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProductionExceptionFilter.name)
  private readonly isProduction: boolean

  // Sensitive error patterns that should be sanitized in production
  private readonly sensitivePatterns = [
    /database/i,
    /sql/i,
    /prisma/i,
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /connection/i,
    /timeout/i,
    /internal server error/i,
    /cannot connect/i,
    /access denied/i,
    /permission denied/i,
    /unauthorized/i,
    /authentication failed/i,
    /invalid credentials/i,
    /file not found/i,
    /directory/i,
    /path/i,
    /module not found/i,
    /syntax error/i,
    /type error/i,
    /reference error/i,
    /range error/i,
    /eval error/i,
    /uri error/i,
    /parse error/i,
    /timeout/i,
    /econnrefused/i,
    /enotfound/i,
    /econnreset/i,
    /epipe/i,
    /emfile/i,
    /enomem/i
  ]

  // Safe error messages for production
  private readonly safeErrorMessages = {
    400: 'Bad Request - Invalid input provided',
    401: 'Unauthorized - Authentication required',
    403: 'Forbidden - Insufficient permissions',
    404: 'Not Found - Resource does not exist',
    405: 'Method Not Allowed',
    409: 'Conflict - Resource already exists',
    422: 'Unprocessable Entity - Validation failed',
    429: 'Too Many Requests - Rate limit exceeded',
    500: 'Internal Server Error - Something went wrong',
    502: 'Bad Gateway - Service temporarily unavailable',
    503: 'Service Unavailable - Server is temporarily down',
    504: 'Gateway Timeout - Request timeout'
  }

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<FastifyRequest>()
    const response = ctx.getResponse<FastifyReply>()

    // Generate request ID for tracking
    const requestId = request.headers['x-request-id'] as string || 
                     request.headers['x-correlation-id'] as string ||
                     this.generateRequestId()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal Server Error'
    let errorName = 'InternalServerError'

    // Extract status and message from HttpException
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const response = exception.getResponse()
      
      if (typeof response === 'string') {
        message = response
      } else if (typeof response === 'object' && response !== null) {
        const errorResponse = response as any
        message = errorResponse.message || errorResponse.error || message
        errorName = errorResponse.error || exception.constructor.name
      }
    } else if (exception instanceof Error) {
      message = exception.message
      errorName = exception.constructor.name
    }

    // Log the full error details for debugging (even in production)
    this.logger.error('Exception caught by global filter', {
      requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.id,
      statusCode,
      originalMessage: message,
      errorName,
      stack: exception instanceof Error ? exception.stack : undefined
    })

    // Sanitize error for production response
    let sanitizedError: SanitizedError

    if (this.isProduction) {
      sanitizedError = this.sanitizeErrorForProduction(
        statusCode,
        message,
        errorName,
        request.url,
        requestId
      )
    } else {
      // Development: Return detailed error information
      sanitizedError = {
        statusCode,
        message,
        error: errorName,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        ...(exception instanceof Error && {
          stack: exception.stack?.split('\n').slice(0, 10) // Limit stack trace
        })
      }
    }

    // Set security headers for error responses
    response.headers({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Request-ID': requestId,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    // Send sanitized error response
    response.code(statusCode).send(sanitizedError)
  }

  private sanitizeErrorForProduction(
    statusCode: number,
    originalMessage: string,
    errorName: string,
    path: string,
    requestId: string
  ): SanitizedError {
    let sanitizedMessage = this.safeErrorMessages[statusCode] || 'An error occurred'

    // Check if the error message contains sensitive information
    const containsSensitiveInfo = this.sensitivePatterns.some(pattern => 
      pattern.test(originalMessage) || pattern.test(errorName)
    )

    if (!containsSensitiveInfo && statusCode < 500) {
      // For client errors (4xx), we can be more specific if no sensitive info
      if (statusCode === 400 && originalMessage.toLowerCase().includes('validation')) {
        sanitizedMessage = 'Invalid input data provided'
      } else if (statusCode === 401) {
        sanitizedMessage = 'Authentication required'
      } else if (statusCode === 403) {
        sanitizedMessage = 'Access denied'
      } else if (statusCode === 404) {
        sanitizedMessage = 'Resource not found'
      } else if (statusCode === 409) {
        sanitizedMessage = 'Resource conflict'
      } else if (statusCode === 422) {
        sanitizedMessage = 'Invalid data submitted'
      } else if (statusCode === 429) {
        sanitizedMessage = 'Too many requests'
      }
    }

    return {
      statusCode,
      message: sanitizedMessage,
      error: this.sanitizeErrorName(errorName, statusCode),
      timestamp: new Date().toISOString(),
      path,
      requestId
    }
  }

  private sanitizeErrorName(errorName: string, statusCode: number): string {
    // Map specific error names to generic names in production
    const errorNameMap: Record<string, string> = {
      'PrismaClientKnownRequestError': 'DatabaseError',
      'PrismaClientUnknownRequestError': 'DatabaseError',
      'PrismaClientValidationError': 'DatabaseError',
      'PrismaClientInitializationError': 'DatabaseError',
      'PrismaClientRustPanicError': 'DatabaseError',
      'QueryFailedError': 'DatabaseError',
      'ConnectionNotFoundError': 'DatabaseError',
      'EntityNotFoundError': 'NotFoundError',
      'CannotConnectError': 'ServiceUnavailableError',
      'TimeoutError': 'RequestTimeoutError',
      'TypeError': 'ValidationError',
      'ReferenceError': 'InternalError',
      'SyntaxError': 'ValidationError',
      'RangeError': 'ValidationError'
    }

    // Use mapped name or generic names based on status code
    const mappedName = errorNameMap[errorName]
    if (mappedName) {
      return mappedName
    }

    // Generic names based on status code ranges
    if (statusCode >= 400 && statusCode < 500) {
      return 'ClientError'
    } else if (statusCode >= 500) {
      return 'ServerError'
    }

    return 'Error'
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}