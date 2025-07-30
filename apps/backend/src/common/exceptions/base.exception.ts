import { HttpException, HttpStatus } from '@nestjs/common'

export interface ErrorDetails {
  code: string
  message: string
  statusCode: number
  timestamp: string
  path?: string
  method?: string
  details?: Record<string, unknown>
  field?: string
  resource?: string
  identifier?: string
}

export abstract class BaseException extends HttpException {
  public readonly code: string
  public readonly timestamp: string
  public readonly details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    statusCode: HttpStatus,
    details?: Record<string, unknown>
  ) {
    super(
      {
        message,
        code,
        statusCode,
        timestamp: new Date().toISOString(),
        details
      },
      statusCode
    )
    
    this.code = code
    this.timestamp = new Date().toISOString()
    this.details = details
    this.name = this.constructor.name
  }
}

export class BusinessException extends BaseException {
  constructor(
    code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>
  ) {
    super(code, message, statusCode, details)
  }
}

export class ValidationException extends BaseException {
  public readonly field?: string
  public readonly errors?: string[]

  constructor(
    message: string,
    field?: string,
    errors?: string[],
    details?: Record<string, unknown>
  ) {
    super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, {
      field,
      errors,
      ...details
    })
    
    this.field = field
    this.errors = errors
  }
}

export class AuthenticationException extends BaseException {
  constructor(
    code = 'UNAUTHORIZED',
    message = 'Authentication required',
    details?: Record<string, unknown>
  ) {
    super(code, message, HttpStatus.UNAUTHORIZED, details)
  }
}

export class AuthorizationException extends BaseException {
  public readonly resource?: string
  public readonly operation?: string

  constructor(
    message = 'Access denied',
    resource?: string,
    operation?: string,
    details?: Record<string, unknown>
  ) {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN, {
      resource,
      operation,
      ...details
    })
    
    this.resource = resource
    this.operation = operation
  }
}

export class NotFoundException extends BaseException {
  public readonly resource?: string
  public readonly identifier?: string

  constructor(
    resource: string,
    identifier?: string,
    details?: Record<string, unknown>
  ) {
    const message = identifier 
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`
      
    super('RESOURCE_NOT_FOUND', message, HttpStatus.NOT_FOUND, {
      resource,
      identifier,
      ...details
    })
    
    this.resource = resource
    this.identifier = identifier
  }
}

export class ConflictException extends BaseException {
  public readonly resource?: string
  public readonly field?: string

  constructor(
    message: string,
    resource?: string,
    field?: string,
    details?: Record<string, unknown>
  ) {
    super('RESOURCE_CONFLICT', message, HttpStatus.CONFLICT, {
      resource,
      field,
      ...details
    })
    
    this.resource = resource
    this.field = field
  }
}

export class PaymentException extends BaseException {
  public readonly paymentCode?: string

  constructor(
    code: string,
    message: string,
    paymentCode?: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, HttpStatus.PAYMENT_REQUIRED, {
      paymentCode,
      ...details
    })
    
    this.paymentCode = paymentCode
  }
}

export class SubscriptionException extends BaseException {
  public readonly planType?: string
  public readonly requiredFeature?: string

  constructor(
    message: string,
    planType?: string,
    requiredFeature?: string,
    details?: Record<string, unknown>
  ) {
    super('SUBSCRIPTION_REQUIRED', message, HttpStatus.PAYMENT_REQUIRED, {
      planType,
      requiredFeature,
      ...details
    })
    
    this.planType = planType
    this.requiredFeature = requiredFeature
  }
}

export class RateLimitException extends BaseException {
  public readonly retryAfter?: number
  public readonly limit?: number

  constructor(
    message = 'Rate limit exceeded',
    retryAfter?: number,
    limit?: number,
    details?: Record<string, unknown>
  ) {
    super('RATE_LIMIT_EXCEEDED', message, HttpStatus.TOO_MANY_REQUESTS, {
      retryAfter,
      limit,
      ...details
    })
    
    this.retryAfter = retryAfter
    this.limit = limit
  }
}

export class ExternalServiceException extends BaseException {
  public readonly service?: string
  public readonly serviceError?: string

  constructor(
    message: string,
    service?: string,
    serviceError?: string,
    details?: Record<string, unknown>
  ) {
    super('EXTERNAL_SERVICE_ERROR', message, HttpStatus.BAD_GATEWAY, {
      service,
      serviceError,
      ...details
    })
    
    this.service = service
    this.serviceError = serviceError
  }
}