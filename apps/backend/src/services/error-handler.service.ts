import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name)

  handleError(error: unknown, context?: string | Record<string, unknown>): never {
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context)
    this.logger.error(`Error in ${contextStr || 'unknown context'}:`, error)
    
    if (error instanceof HttpException) {
      throw error
    }
    
    if (error instanceof Error) {
      throw new HttpException(
        {
          message: error.message,
          error: 'Internal Server Error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
    
    throw new HttpException(
      'An unexpected error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }

  createValidationError(message: string, details?: unknown): HttpException {
    return new HttpException(
      {
        code: ErrorCode.VALIDATION_ERROR,
        message,
        details
      },
      HttpStatus.BAD_REQUEST
    )
  }

  createBusinessError(message: string, details?: unknown): HttpException {
    return new HttpException(
      {
        code: ErrorCode.BUSINESS_ERROR,
        message,
        details
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    )
  }

  createConfigError(message: string, details?: unknown): HttpException {
    return new HttpException(
      {
        code: ErrorCode.CONFIG_ERROR,
        message,
        details
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }

  createNotFoundError(message: string, details?: unknown): HttpException {
    return new HttpException(
      {
        code: ErrorCode.BUSINESS_ERROR,
        message,
        details
      },
      HttpStatus.NOT_FOUND
    )
  }

  logError(error: unknown, context?: string | Record<string, unknown>): void {
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context)
    this.logger.error(`Error in ${contextStr || 'unknown context'}:`, error)
  }
}