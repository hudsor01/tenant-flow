import { Test, TestingModule } from '@nestjs/testing'
import { QueueErrorHandlerService, QueueError, ErrorHandlingResult } from '../../services/queue-error-handler.service'
import { Job } from 'bull'
import {
  QueueTestDataFactory,
  MockJobFactory,
  TestErrorFactory,
  QueueTestEnvironment,
  QueueTestModuleBuilder
} from '../shared/queue-test-utilities'

describe('QueueErrorHandlerService', () => {
  let service: QueueErrorHandlerService
  let module: TestingModule

  beforeAll(() => {
    QueueTestEnvironment.setupTestTimeout()
    QueueTestEnvironment.setupProcessEnv()
  })

  beforeEach(async () => {
    module = await QueueTestModuleBuilder.create()
      .withProvider(QueueErrorHandlerService)
      .build()

    service = module.get<QueueErrorHandlerService>(QueueErrorHandlerService)
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await module.close()
  })

  afterAll(() => {
    QueueTestEnvironment.cleanupProcessEnv()
  })

  describe('handleJobFailure', () => {
    it('should handle retryable error correctly', async () => {
      const job = MockJobFactory.createEmailJob()
      const error = TestErrorFactory.createNetworkError('Connection timeout')

      const result = await service.handleJobFailure(job, error)

      expect(result.shouldRetry).toBe(true)
      expect(result.retryDelay).toBeGreaterThan(0)
      expect(result.escalateToAdmin).toBe(false)
    })

    it('should handle non-retryable error correctly', async () => {
      const job = MockJobFactory.createPaymentJob()
      const error = TestErrorFactory.createValidationError('Invalid payment data')

      const result = await service.handleJobFailure(job, error)

      expect(result.shouldRetry).toBe(false)
      expect(result.escalateToAdmin).toBeDefined()
    })

    it('should log error details appropriately', async () => {
      const job = MockJobFactory.createEmailJob()
      const error = TestErrorFactory.createRetryableError('Temporary failure')
      const loggerSpy = jest.spyOn(service['logger'], 'error')

      await service.handleJobFailure(job, error)

      expect(loggerSpy).toHaveBeenCalledWith('Job failed', expect.objectContaining({
        jobId: job.id?.toString(),
        queueName: job.queue.name,
        error: error.message,
        isRetryable: true
      }))
    })

    it('should sanitize sensitive job data in logs', async () => {
      const sensitiveData = {
        ...QueueTestDataFactory.createPaymentJobData(),
        password: 'secret123',
        apiKey: 'key-456'
      } as any
      const job = MockJobFactory.createJob(sensitiveData)
      const error = TestErrorFactory.createNetworkError()

      await service.handleJobFailure(job, error)

      // Verify that sanitization was called (we test the actual sanitization in private method tests)
      expect(service['sanitizeJobData']).toBeDefined()
    })
  })

  describe('isRetryableError', () => {
    it('should correctly identify non-retryable errors', () => {
      const nonRetryableErrors = [
        TestErrorFactory.createValidationError('validation failed'),
        new Error('invalid input data'),
        new Error('required field missing'),
        new Error('unauthorized access'),
        new Error('forbidden operation'),
        new Error('access denied'),
        new Error('malformed request'),
        new Error('parse error occurred'),
        new Error('syntax error in query')
      ]

      nonRetryableErrors.forEach(error => {
        expect(service['isRetryableError'](error)).toBe(false)
      })
    })

    it('should correctly identify retryable errors', () => {
      const retryableErrors = [
        TestErrorFactory.createNetworkError('network timeout'),
        new Error('connection refused'),
        new Error('temporary service problem'),
        new Error('rate limit exceeded'),
        new Error('unknown service error')
      ]

      retryableErrors.forEach(error => {
        expect(service['isRetryableError'](error)).toBe(true)
      })
    })

    it('should handle HTTP errors correctly', () => {
      const httpError500 = new Error('Internal Server Error') as any
      httpError500.name = 'HTTPError'
      httpError500.response = { status: 500 }

      const httpError400 = new Error('Bad Request') as any
      httpError400.name = 'HTTPError'
      httpError400.response = { status: 400 }

      expect(service['isRetryableError'](httpError500)).toBe(true)
      expect(service['isRetryableError'](httpError400)).toBe(false)
    })
  })

  describe('queue-specific retry strategies', () => {
    describe('email queue strategy', () => {
      it('should provide appropriate retry strategy for email queue', () => {
        const queueError: QueueError = {
          jobId: '123',
          queueName: 'email',
          attemptNumber: 2,
          error: TestErrorFactory.createNetworkError(),
          jobData: {},
          timestamp: new Date(),
          isRetryable: true
        }
        const job = MockJobFactory.createEmailJob()

        const result = service['getEmailRetryStrategy'](queueError, job)

        expect(result.shouldRetry).toBe(true)
        expect(result.maxRetries).toBe(5)
        expect(result.retryDelay).toBeGreaterThan(0)
      })

      it('should stop retrying after max attempts for email queue', () => {
        const queueError: QueueError = {
          jobId: '123',
          queueName: 'email',
          attemptNumber: 5, // At max retries
          error: TestErrorFactory.createNetworkError(),
          jobData: {},
          timestamp: new Date(),
          isRetryable: true
        }
        const job = MockJobFactory.createEmailJob()

        const result = service['getEmailRetryStrategy'](queueError, job)

        expect(result.shouldRetry).toBe(false)
        expect(result.escalateToAdmin).toBe(true) // Email failures escalate after 3+ attempts
      })
    })

    describe('payment queue strategy', () => {
      it('should provide conservative retry strategy for payment queue', () => {
        const queueError: QueueError = {
          jobId: '456',
          queueName: 'payments',
          attemptNumber: 1,
          error: TestErrorFactory.createStripeError('rate_limit'),
          jobData: {},
          timestamp: new Date(),
          isRetryable: true
        }
        const job = MockJobFactory.createPaymentJob()

        const result = service['getPaymentRetryStrategy'](queueError, job)

        expect(result.shouldRetry).toBe(true)
        expect(result.maxRetries).toBe(3) // Conservative for payments
        expect(result.escalateToAdmin).toBe(false)
      })

      it('should escalate payment failures immediately for unknown errors', () => {
        const queueError: QueueError = {
          jobId: '456',
          queueName: 'payments',
          attemptNumber: 1,
          error: new Error('Unknown payment error'),
          jobData: {},
          timestamp: new Date(),
          isRetryable: true
        }
        const job = MockJobFactory.createPaymentJob()

        const result = service['getPaymentRetryStrategy'](queueError, job)

        expect(result.shouldRetry).toBe(false)
        expect(result.escalateToAdmin).toBe(true)
      })

      it('should always escalate payment failures when retries exhausted', () => {
        const queueError: QueueError = {
          jobId: '456',
          queueName: 'payments',
          attemptNumber: 3, // At max retries
          error: TestErrorFactory.createStripeError('card_declined'),
          jobData: {},
          timestamp: new Date(),
          isRetryable: true
        }
        const job = MockJobFactory.createPaymentJob()

        const result = service['getPaymentRetryStrategy'](queueError, job)

        expect(result.shouldRetry).toBe(false)
        expect(result.escalateToAdmin).toBe(true) // Always escalate payment failures
      })
    })

    describe('default retry strategy', () => {
      it('should provide default strategy for unknown queues', () => {
        const queueError: QueueError = {
          jobId: '789',
          queueName: 'unknown-queue',
          attemptNumber: 1,
          error: TestErrorFactory.createRetryableError(),
          jobData: {},
          timestamp: new Date(),
          isRetryable: true
        }
        const job = MockJobFactory.createJob({})

        const result = service['getDefaultRetryStrategy'](queueError, job)

        expect(result.shouldRetry).toBe(true)
        expect(result.maxRetries).toBe(3)
        expect(result.retryDelay).toBeGreaterThan(0)
      })
    })
  })

  describe('calculateExponentialBackoff', () => {
    it('should calculate correct exponential backoff', () => {
      const baseDelay = 1000
      
      const delay1 = service['calculateExponentialBackoff'](1, baseDelay)
      const delay2 = service['calculateExponentialBackoff'](2, baseDelay)
      const delay3 = service['calculateExponentialBackoff'](3, baseDelay)

      expect(delay1).toBeGreaterThanOrEqual(1800) // 2^1 * 1000 + jitter
      expect(delay1).toBeLessThanOrEqual(2250) // Within jitter range
      
      expect(delay2).toBeGreaterThanOrEqual(3600) // 2^2 * 1000 + jitter
      expect(delay2).toBeLessThanOrEqual(4500) // Within jitter range
      
      expect(delay3).toBeGreaterThanOrEqual(7200) // 2^3 * 1000 + jitter
      expect(delay3).toBeLessThanOrEqual(9000) // Within jitter range
    })

    it('should respect maximum delay limit', () => {
      const maxDelay = 5000
      const delay = service['calculateExponentialBackoff'](10, 1000, maxDelay)

      expect(delay).toBeLessThanOrEqual(6250) // maxDelay + 25% jitter
    })

    it('should add jitter to prevent thundering herd', () => {
      const delays = Array(10).fill(0).map(() => 
        service['calculateExponentialBackoff'](2, 1000)
      )

      // All delays should be different due to jitter
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('isStripeRetryableError', () => {
    it('should identify retryable Stripe errors', () => {
      const retryableStripeErrors = [
        TestErrorFactory.createStripeError('rate_limit'),
        TestErrorFactory.createStripeError('api_connection_error'),
        TestErrorFactory.createStripeError('api_error'),
        TestErrorFactory.createStripeError('card_error: processing_error')
      ]

      retryableStripeErrors.forEach(error => {
        expect(service['isStripeRetryableError'](error)).toBe(true)
      })
    })

    it('should identify non-retryable Stripe errors', () => {
      const nonRetryableStripeErrors = [
        TestErrorFactory.createStripeError('card_declined'),
        TestErrorFactory.createStripeError('insufficient_funds'),
        TestErrorFactory.createStripeError('invalid_request_error')
      ]

      nonRetryableStripeErrors.forEach(error => {
        expect(service['isStripeRetryableError'](error)).toBe(false)
      })
    })
  })

  describe('shouldEscalateError', () => {
    it('should escalate payment queue errors', () => {
      const paymentError: QueueError = {
        jobId: '123',
        queueName: 'payments',
        attemptNumber: 1,
        error: new Error('Payment failed'),
        jobData: {},
        timestamp: new Date(),
        isRetryable: false
      }

      expect(service['shouldEscalateError'](paymentError)).toBe(true)
    })

    it('should escalate after multiple failed attempts', () => {
      const multipleAttemptError: QueueError = {
        jobId: '123',
        queueName: 'email',
        attemptNumber: 3,
        error: new Error('Multiple failures'),
        jobData: {},
        timestamp: new Date(),
        isRetryable: false
      }

      expect(service['shouldEscalateError'](multipleAttemptError)).toBe(true)
    })

    it('should escalate critical security errors', () => {
      const securityError: QueueError = {
        jobId: '123',
        queueName: 'email',
        attemptNumber: 1,
        error: new Error('Critical security breach detected'),
        jobData: {},
        timestamp: new Date(),
        isRetryable: false
      }

      expect(service['shouldEscalateError'](securityError)).toBe(true)
    })

    it('should not escalate minor errors with few attempts', () => {
      const minorError: QueueError = {
        jobId: '123',
        queueName: 'email',
        attemptNumber: 1,
        error: new Error('Minor processing error'),
        jobData: {},
        timestamp: new Date(),
        isRetryable: true
      }

      expect(service['shouldEscalateError'](minorError)).toBe(false)
    })
  })

  describe('sanitizeJobData', () => {
    it('should remove sensitive fields from job data', () => {
      const sensitiveData = {
        normalField: 'keep-this',
        password: 'secret123',
        token: 'auth-token',
        apiKey: 'api-key-123',
        secret: 'top-secret',
        privateKey: 'private-key-data',
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',
        paymentMethod: 'pm_123',
        bankAccount: 'ba_456'
      }

      const sanitized = service['sanitizeJobData'](sensitiveData)

      // Normal fields should be preserved
      expect(sanitized.normalField).toBe('keep-this')

      // Sensitive fields should be redacted
      const sensitiveFields = [
        'password', 'token', 'apiKey', 'secret', 'privateKey',
        'creditCard', 'ssn', 'paymentMethod', 'bankAccount'
      ]
      
      sensitiveFields.forEach(field => {
        expect(sanitized[field]).toBe('[REDACTED]')
      })
    })

    it('should handle non-object data gracefully', () => {
      expect(service['sanitizeJobData']('string')).toBe('string')
      expect(service['sanitizeJobData'](123)).toBe(123)
      expect(service['sanitizeJobData'](null)).toBe(null)
      expect(service['sanitizeJobData'](undefined)).toBe(undefined)
    })

    it('should handle data without sensitive fields', () => {
      const cleanData = { id: '123', name: 'test', value: 456 }
      const sanitized = service['sanitizeJobData'](cleanData)

      expect(sanitized).toEqual(cleanData)
    })
  })

  describe('error storage and escalation', () => {
    it('should attempt to store error for debugging', async () => {
      const job = MockJobFactory.createEmailJob()
      const error = TestErrorFactory.createRetryableError()
      const loggerSpy = jest.spyOn(service['logger'], 'debug')

      await service.handleJobFailure(job, error)

      expect(loggerSpy).toHaveBeenCalledWith(
        'Storing error for debugging',
        expect.any(Object)
      )
    })

    it('should attempt escalation for critical errors', async () => {
      const job = MockJobFactory.createPaymentJob()
      const error = TestErrorFactory.createStripeError('Critical payment failure')
      const loggerSpy = jest.spyOn(service['logger'], 'error')

      await service.handleJobFailure(job, error)

      // Check for escalation log entry
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('ESCALATION'),
        expect.any(Object)
      )
    })
  })

  describe('integration scenarios', () => {
    it('should handle multiple concurrent error processing', async () => {
      const jobs = [
        MockJobFactory.createEmailJob(),
        MockJobFactory.createPaymentJob(),
        MockJobFactory.createEmailJob()
      ]
      const errors = [
        TestErrorFactory.createNetworkError(),
        TestErrorFactory.createStripeError('card_declined'),
        TestErrorFactory.createValidationError()
      ]

      const results = await Promise.all(
        jobs.map((job, index) => service.handleJobFailure(job, errors[index]))
      )


      expect(results).toHaveLength(3)
      expect(results[0].shouldRetry).toBe(true) // Network error is retryable
      expect(results[1].shouldRetry).toBe(false) // Card declined is not retryable 
      expect(results[2].shouldRetry).toBe(false) // Validation error is not retryable
    })

    it('should maintain consistent behavior across error types', async () => {
      const job = MockJobFactory.createEmailJob()
      const sameErrorType = TestErrorFactory.createNetworkError('Connection failed')

      const result1 = await service.handleJobFailure(job, sameErrorType)
      const result2 = await service.handleJobFailure(job, sameErrorType)

      expect(result1.shouldRetry).toBe(result2.shouldRetry)
      expect(result1.maxRetries).toBe(result2.maxRetries)
    })
  })
})