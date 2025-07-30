import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus
} from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { 
  BusinessException,
  ValidationException,
  AuthenticationException,
  AuthorizationException,
  NotFoundException,
  ConflictException
} from '../exceptions/base.exception'

/**
 * Interceptor that transforms various error types into standardized HTTP exceptions
 * This ensures consistent error responses across the application
 */
@Injectable()
export class ErrorTransformationInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error) => {
        const transformedError = this.transformError(error)
        return throwError(() => transformedError)
      })
    )
  }

  private transformError(error: unknown): HttpException {
    // If already an HTTP exception, return as-is
    if (error instanceof HttpException) {
      return error
    }

    // Handle Prisma errors
    if (error instanceof PrismaClientKnownRequestError) {
      return this.transformPrismaError(error)
    }

    // Handle custom application errors
    if (error && typeof error === 'object' && 'code' in error) {
      return this.transformCustomError(error)
    }

    // Handle validation errors from class-validator
    if (error && typeof error === 'object' && 'response' in error && (error as { response?: { error?: { code?: string } } }).response?.error?.code === 'VALIDATION_ERROR') {
      const validationError = error as { response: { error: { message: string; field?: string; errors?: string[] } } }
      return new ValidationException(
        validationError.response.error.message,
        validationError.response.error.field,
        validationError.response.error.errors
      )
    }

    // Handle Node.js errors
    if (error instanceof Error) {
      return this.transformNodeError(error)
    }

    // Fallback for unknown errors
    return new BusinessException(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { originalError: String(error) }
    )
  }

  private transformPrismaError(error: PrismaClientKnownRequestError): HttpException {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = error.meta?.target as string[]
        return new ConflictException(
          `A record with this ${target?.join(', ') || 'value'} already exists`,
          'database_record',
          target?.join(', '),
          { prismaCode: error.code, meta: error.meta }
        )
      }

      case 'P2025':
        // Record not found
        return new NotFoundException(
          'Record',
          undefined,
          { prismaCode: error.code, meta: error.meta }
        )

      case 'P2003':
        // Foreign key constraint violation
        return new ValidationException(
          'Referenced record does not exist',
          'foreign_key',
          ['Invalid reference'],
          { prismaCode: error.code, meta: error.meta }
        )

      case 'P2014':
        // Invalid ID
        return new ValidationException(
          'Invalid ID provided',
          'id',
          ['Must be a valid identifier'],
          { prismaCode: error.code }
        )

      case 'P2021':
      case 'P2022':
        // Schema errors
        return new BusinessException(
          'DATABASE_SCHEMA_ERROR',
          'Database schema error',
          HttpStatus.INTERNAL_SERVER_ERROR,
          { prismaCode: error.code, meta: error.meta }
        )

      default:
        return new BusinessException(
          'DATABASE_ERROR',
          'A database error occurred',
          HttpStatus.INTERNAL_SERVER_ERROR,
          { prismaCode: error.code, message: error.message }
        )
    }
  }

  private transformCustomError(error: unknown): HttpException {
    const customError = error as { code: string; message: string; field?: string; resource?: string; errors?: string[]; operation?: string }
    const { code, message, field, resource } = customError

    switch (code) {
      case 'VALIDATION_ERROR':
        return new ValidationException(message, field, customError.errors)

      case 'UNAUTHORIZED':
      case 'INVALID_CREDENTIALS':
      case 'TOKEN_EXPIRED':
      case 'INVALID_TOKEN':
        return new AuthenticationException(code, message)

      case 'FORBIDDEN':
      case 'INSUFFICIENT_PERMISSIONS':
      case 'PERMISSION_ERROR':
        return new AuthorizationException(message, resource, customError.operation)

      case 'NOT_FOUND':
      case 'RESOURCE_NOT_FOUND':
      case 'NOT_FOUND_ERROR':
        return new NotFoundException(resource || 'Resource')

      case 'CONFLICT':
      case 'RESOURCE_ALREADY_EXISTS':
        return new ConflictException(message, resource, field)

      case 'BAD_REQUEST':
      case 'INVALID_INPUT':
        return new ValidationException(message, field)

      default:
        return new BusinessException(code, message, HttpStatus.BAD_REQUEST)
    }
  }

  private transformNodeError(error: Error): HttpException {
    // Handle specific Node.js error types
    if (error.name === 'ValidationError') {
      return new ValidationException(error.message)
    }

    if (error.name === 'CastError') {
      return new ValidationException('Invalid data format', 'id')
    }

    if (error.message.includes('timeout')) {
      return new BusinessException(
        'TIMEOUT_ERROR',
        'Request timeout',
        HttpStatus.REQUEST_TIMEOUT
      )
    }

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return new BusinessException(
        'EXTERNAL_SERVICE_ERROR',
        'External service unavailable',
        HttpStatus.BAD_GATEWAY
      )
    }

    // Generic error fallback
    return new BusinessException(
      'INTERNAL_SERVER_ERROR',
      error.message || 'An unexpected error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }
}