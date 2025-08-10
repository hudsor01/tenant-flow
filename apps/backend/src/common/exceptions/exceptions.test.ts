import { HttpStatus } from '@nestjs/common'
import {
  BusinessException,
  ValidationException,
  AuthenticationException,
  AuthorizationException,
  NotFoundException,
  ConflictException,
  PaymentException,
  SubscriptionException,
  RateLimitException,
  ExternalServiceException
} from './base.exception'

describe('Custom Exceptions', () => {
  describe('BusinessException', () => {
    it('should create a business exception with correct properties', () => {
      const exception = new BusinessException(
        'BUSINESS_ERROR',
        'Test business error',
        HttpStatus.BAD_REQUEST,
        { extra: 'data' }
      )

      expect(exception.code).toBe('BUSINESS_ERROR')
      expect(exception.message).toBe('Test business error')
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST)
      expect(exception.details).toEqual({ extra: 'data' })
      expect(exception.timestamp).toBeDefined()
    })

    it('should use default status code if not provided', () => {
      const exception = new BusinessException(
        'BUSINESS_ERROR',
        'Test error'
      )

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST)
    })
  })

  describe('ValidationException', () => {
    it('should create validation exception with field and errors', () => {
      const exception = new ValidationException(
        'Validation failed',
        'email',
        ['Email is required', 'Email must be valid']
      )

      expect(exception.code).toBe('VALIDATION_ERROR')
      expect(exception.field).toBe('email')
      expect(exception.errors).toEqual(['Email is required', 'Email must be valid'])
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST)
    })

    it('should work without field and errors', () => {
      const exception = new ValidationException('Validation failed')

      expect(exception.code).toBe('VALIDATION_ERROR')
      expect(exception.field).toBeUndefined()
      expect(exception.errors).toBeUndefined()
    })
  })

  describe('AuthenticationException', () => {
    it('should create authentication exception', () => {
      const exception = new AuthenticationException(
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      )

      expect(exception.code).toBe('INVALID_CREDENTIALS')
      expect(exception.message).toBe('Invalid email or password')
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
    })

    it('should use default values', () => {
      const exception = new AuthenticationException()

      expect(exception.code).toBe('UNAUTHORIZED')
      expect(exception.message).toBe('Authentication required')
    })
  })

  describe('AuthorizationException', () => {
    it('should create authorization exception with resource and operation', () => {
      const exception = new AuthorizationException(
        'Cannot delete property',
        'Property',
        'delete'
      )

      expect(exception.code).toBe('FORBIDDEN')
      expect(exception.message).toBe('Cannot delete property')
      expect(exception.resource).toBe('Property')
      expect(exception.operation).toBe('delete')
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN)
    })

    it('should use default message', () => {
      const exception = new AuthorizationException()

      expect(exception.message).toBe('Access denied')
    })
  })

  describe('NotFoundException', () => {
    it('should create not found exception with resource and identifier', () => {
      const exception = new NotFoundException('Property', 'prop-123')

      expect(exception.code).toBe('RESOURCE_NOT_FOUND')
      expect(exception.message).toBe("Property with ID 'prop-123' not found")
      expect(exception.resource).toBe('Property')
      expect(exception.identifier).toBe('prop-123')
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND)
    })

    it('should work without identifier', () => {
      const exception = new NotFoundException('Property')

      expect(exception.message).toBe('Property not found')
      expect(exception.identifier).toBeUndefined()
    })
  })

  describe('ConflictException', () => {
    it('should create conflict exception', () => {
      const exception = new ConflictException(
        'User',
        'user-123',
        'Email already exists',
        'email'
      )

      expect(exception.code).toBe('RESOURCE_CONFLICT')
      expect(exception.message).toBe('Email already exists')
      expect(exception.resource).toBe('User')
      expect(exception.field).toBe('email')
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT)
    })
  })

  describe('PaymentException', () => {
    it('should create payment exception', () => {
      const exception = new PaymentException(
        'CARD_DECLINED',
        'Your card was declined',
        'card_declined'
      )

      expect(exception.code).toBe('CARD_DECLINED')
      expect(exception.message).toBe('Your card was declined')
      expect(exception.paymentCode).toBe('card_declined')
      expect(exception.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED)
    })
  })

  describe('SubscriptionException', () => {
    it('should create subscription exception', () => {
      const exception = new SubscriptionException(
        'Premium feature required',
        'GROWTH',
        'export_data'
      )

      expect(exception.code).toBe('SUBSCRIPTION_REQUIRED')
      expect(exception.message).toBe('Premium feature required')
      expect(exception.planType).toBe('GROWTH')
      expect(exception.requiredFeature).toBe('export_data')
      expect(exception.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED)
    })
  })

  describe('RateLimitException', () => {
    it('should create rate limit exception', () => {
      const exception = new RateLimitException(
        'Too many requests',
        60,
        100
      )

      expect(exception.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(exception.message).toBe('Too many requests')
      expect(exception.retryAfter).toBe(60)
      expect(exception.limit).toBe(100)
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS)
    })

    it('should use default message', () => {
      const exception = new RateLimitException()

      expect(exception.message).toBe('Rate limit exceeded')
    })
  })

  describe('ExternalServiceException', () => {
    it('should create external service exception', () => {
      const exception = new ExternalServiceException(
        'Stripe API error',
        'Stripe',
        'invalid_request_error'
      )

      expect(exception.code).toBe('EXTERNAL_SERVICE_ERROR')
      expect(exception.message).toBe('Stripe API error')
      expect(exception.service).toBe('Stripe')
      expect(exception.serviceError).toBe('invalid_request_error')
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
    })
  })

  describe('Exception Response Format', () => {
    it('should format HTTP exception response correctly', () => {
      const exception = new ValidationException(
        'Email is required',
        'email',
        ['Email is required']
      )

      const response = exception.getResponse() as any

      expect(response).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Email is required',
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        details: {
          field: 'email',
          errors: ['Email is required']
        }
      })
    })
  })
})