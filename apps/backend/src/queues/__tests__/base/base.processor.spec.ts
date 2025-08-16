import { BaseProcessor, ProcessorResult, BaseJobData } from '../../base/base.processor'
import { Job } from 'bull'
import {
  QueueTestDataFactory,
  MockJobFactory,
  TestErrorFactory,
  QueueTestAssertions,
  QueueTestTiming,
  QueueTestEnvironment
} from '../shared/queue-test-utilities'

// Test implementation of BaseProcessor
class TestProcessor extends BaseProcessor<BaseJobData> {
  public shouldFail = false
  public shouldThrow = false
  public processingDelay = 0
  public customError: Error | null = null

  constructor() {
    super('TestProcessor')
  }

  async processJob(job: Job<BaseJobData>): Promise<ProcessorResult> {
    if (this.processingDelay > 0) {
      await QueueTestTiming.waitFor(this.processingDelay)
    }

    if (this.shouldThrow) {
      throw this.customError || TestErrorFactory.createNetworkError('Test processing error')
    }

    return QueueTestDataFactory.createProcessorResult({
      success: !this.shouldFail,
      data: { jobId: job.id, processed: true },
      error: this.shouldFail ? 'Test failure' : undefined
    })
  }

  // Expose protected methods for testing
  public validateJobDataPublic(data: BaseJobData): void {
    return this.validateJobData(data)
  }

  public sanitizeLogDataPublic(data: BaseJobData): Partial<BaseJobData> {
    return this.sanitizeLogData(data)
  }

  public calculateRetryDelayPublic(attemptNumber: number, baseDelay?: number, maxDelay?: number): number {
    return this.calculateRetryDelay(attemptNumber, baseDelay, maxDelay)
  }

  public isRetryableErrorPublic(error: Error): boolean {
    return this.isRetryableError(error)
  }
}

describe('BaseProcessor', () => {
  let processor: TestProcessor
  let testJob: Job<BaseJobData>

  beforeAll(() => {
    QueueTestEnvironment.setupTestTimeout()
    QueueTestEnvironment.setupProcessEnv()
  })

  beforeEach(() => {
    processor = new TestProcessor()
    // Reset TestProcessor state to ensure clean tests
    processor.shouldFail = false
    processor.shouldThrow = false
    processor.processingDelay = 0
    processor.customError = null
    
    testJob = MockJobFactory.createJob(QueueTestDataFactory.createBaseJobData())
    jest.clearAllMocks()
  })

  afterAll(() => {
    QueueTestEnvironment.cleanupProcessEnv()
  })

  describe('handleJob', () => {
    it('should process job successfully and update progress', async () => {
      const result = await processor.handleJob(testJob)

      QueueTestAssertions.expectProcessorResult(result, {
        success: true,
        data: { jobId: testJob.id, processed: true }
      })
      QueueTestAssertions.expectJobProgress(testJob, 2) // Start and completion
    })

    it('should handle job failure gracefully', async () => {
      processor.shouldFail = true

      const result = await processor.handleJob(testJob)

      QueueTestAssertions.expectProcessorResult(result, {
        success: false,
        error: 'Test failure'
      })
      expect(result.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle processing exceptions', async () => {
      const testError = TestErrorFactory.createValidationError('Processing failed')
      processor.shouldThrow = true
      processor.customError = testError

      const result = await processor.handleJob(testJob)

      QueueTestAssertions.expectProcessorResult(result, {
        success: false,
        error: testError.message
      })
    })

    it('should measure processing time accurately', async () => {
      processor.processingDelay = 100

      const { result, time } = await QueueTestTiming.measureExecutionTime(
        () => processor.handleJob(testJob)
      )

      expect(result.processingTime).toBeGreaterThanOrEqual(90)
      expect(time).toBeGreaterThanOrEqual(90)
    })

    it('should handle job without ID gracefully', async () => {
      const jobWithoutId = MockJobFactory.createJob(
        QueueTestDataFactory.createBaseJobData(),
        { id: undefined }
      )

      const result = await processor.handleJob(jobWithoutId)

      expect(result.success).toBe(true)
      // Should handle undefined ID without crashing
    })

    it('should handle job with null data using optional chaining', async () => {
      const jobWithNullData = MockJobFactory.createJob(null as any)

      const result = await processor.handleJob(jobWithNullData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Job data is required') // Exact error from validateJobData
      expect(result.processingTime).toBeGreaterThanOrEqual(0)
      expect(result.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('validateJobData', () => {
    it('should pass validation for valid job data', () => {
      const validData = QueueTestDataFactory.createBaseJobData()

      expect(() => processor.validateJobDataPublic(validData)).not.toThrow()
    })

    it('should throw exact error message for falsy data', () => {
      // Test exact production behavior for falsy values
      expect(() => processor.validateJobDataPublic(null as any)).toThrow('Job data is required')
      expect(() => processor.validateJobDataPublic(undefined as any)).toThrow('Job data is required')
      expect(() => processor.validateJobDataPublic('' as any)).toThrow('Job data is required')
      expect(() => processor.validateJobDataPublic(0 as any)).toThrow('Job data is required')
      expect(() => processor.validateJobDataPublic(false as any)).toThrow('Job data is required')
    })

    it('should validate organizationId type when present', () => {
      const invalidData = QueueTestDataFactory.createBaseJobData({
        organizationId: 123 as any
      })

      expect(() => processor.validateJobDataPublic(invalidData)).toThrow(
        'organizationId must be a string'
      )
      
      // Test other non-string types
      expect(() => processor.validateJobDataPublic({
        organizationId: {} as any
      })).toThrow('organizationId must be a string')
      
      expect(() => processor.validateJobDataPublic({
        organizationId: [] as any  
      })).toThrow('organizationId must be a string')
    })

    it('should validate userId type when present', () => {
      const invalidData = QueueTestDataFactory.createBaseJobData({
        userId: {} as any
      })

      expect(() => processor.validateJobDataPublic(invalidData)).toThrow(
        'userId must be a string'
      )
      
      // Test other non-string types  
      expect(() => processor.validateJobDataPublic({
        userId: 456 as any
      })).toThrow('userId must be a string')
      
      // null is falsy so it won't trigger validation in production
      expect(() => processor.validateJobDataPublic({
        userId: null as any
      })).not.toThrow()
    })

    it('should not validate undefined optional fields', () => {
      // Production code only validates if fields exist (truthy check)
      const dataWithUndefinedFields = {
        organizationId: undefined,
        userId: undefined,
        correlationId: 'test-123'
      }

      expect(() => processor.validateJobDataPublic(dataWithUndefinedFields)).not.toThrow()
      
      // Also test with missing fields entirely
      const dataWithMissingFields = {
        correlationId: 'test-123'
      }
      
      expect(() => processor.validateJobDataPublic(dataWithMissingFields)).not.toThrow()
    })
  })

  describe('sanitizeLogData', () => {
    it('should replace exact sensitive fields with [REDACTED]', () => {
      const sensitiveData = {
        ...QueueTestDataFactory.createBaseJobData(),
        password: 'secret123',
        token: 'auth-token',
        apiKey: 'api-key-123',
        secret: 'top-secret',
        privateKey: 'key-data',
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',
        paymentMethod: 'pm_123',
        bankAccount: 'ba_456',
        normalField: 'keep-this'
      } as any

      const sanitized = processor.sanitizeLogDataPublic(sensitiveData)

      // Test exact sensitive fields list from production code
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.token).toBe('[REDACTED]')
      expect(sanitized.apiKey).toBe('[REDACTED]')
      expect(sanitized.secret).toBe('[REDACTED]')
      expect(sanitized.privateKey).toBe('[REDACTED]')
      expect(sanitized.creditCard).toBe('[REDACTED]')
      expect(sanitized.ssn).toBe('[REDACTED]')
      expect(sanitized.paymentMethod).toBe('[REDACTED]')
      expect(sanitized.bankAccount).toBe('[REDACTED]')
      
      // Non-sensitive fields preserved
      expect(sanitized.normalField).toBe('keep-this')
      expect(sanitized.organizationId).toBe(sensitiveData.organizationId)
    })

    it('should handle data without sensitive fields', () => {
      const cleanData = QueueTestDataFactory.createBaseJobData()

      const sanitized = processor.sanitizeLogDataPublic(cleanData)

      expect(sanitized).toEqual(cleanData)
    })

    it('should return non-object data unchanged', () => {
      // Test exact production behavior for null/undefined/non-object
      expect(processor.sanitizeLogDataPublic(null as any)).toBe(null)
      expect(processor.sanitizeLogDataPublic(undefined as any)).toBe(undefined)
      expect(processor.sanitizeLogDataPublic('string' as any)).toBe('string')
      expect(processor.sanitizeLogDataPublic(123 as any)).toBe(123)
    })
  })

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(processor.calculateRetryDelayPublic(1)).toBeGreaterThanOrEqual(2000)
      expect(processor.calculateRetryDelayPublic(2)).toBeGreaterThanOrEqual(4000)
      expect(processor.calculateRetryDelayPublic(3)).toBeGreaterThanOrEqual(8000)
    })

    it('should respect max delay limit', () => {
      const delay = processor.calculateRetryDelayPublic(10, 1000, 5000)
      expect(delay).toBeLessThanOrEqual(6000) // Max + jitter
    })

    it('should add jitter to prevent thundering herd', () => {
      const delays = Array(10).fill(0).map(() => 
        processor.calculateRetryDelayPublic(2, 1000, 10000)
      )

      // All delays should be different due to jitter
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })

    it('should use custom base delay', () => {
      const customDelay = processor.calculateRetryDelayPublic(1, 5000)
      expect(customDelay).toBeGreaterThanOrEqual(10000) // 2^1 * 5000
    })
  })

  describe('isRetryableError', () => {
    it('should not retry ValidationError by name or constructor', () => {
      const validationError = TestErrorFactory.createValidationError()
      // Verify the test error factory creates proper ValidationError
      expect(validationError.name).toBe('ValidationError')
      expect(processor.isRetryableErrorPublic(validationError)).toBe(false)
    })

    it('should not retry errors with ValidationError constructor name', () => {
      const customError = new Error('Test error')
      // Mock constructor name to match production logic
      Object.defineProperty(customError.constructor, 'name', { value: 'ValidationError' })
      expect(processor.isRetryableErrorPublic(customError)).toBe(false)
    })

    it('should not retry errors with exact non-retryable message patterns', () => {
      // Test exact patterns from production code (case-insensitive)
      const nonRetryablePatterns = [
        'validation', 'invalid', 'required', 'unauthorized', 'forbidden',
        'access denied', 'malformed', 'parse error', 'syntax error'
      ]

      nonRetryablePatterns.forEach(pattern => {
        // Test lowercase
        expect(processor.isRetryableErrorPublic(new Error(pattern))).toBe(false)
        // Test uppercase (should still match due to toLowerCase())
        expect(processor.isRetryableErrorPublic(new Error(pattern.toUpperCase()))).toBe(false)
        // Test in sentence
        expect(processor.isRetryableErrorPublic(new Error(`This is ${pattern} message`))).toBe(false)
      })
    })

    it('should retry errors not matching non-retryable patterns', () => {
      // Test production logic matching QueueErrorHandlerService exactly
      const retryableErrors = [
        new Error('network timeout'), // Contains 'network' and 'timeout' -> explicit true
        new Error('connection refused'), // Contains 'connection' -> explicit true
        new Error('temporary service problem'), // Contains 'temporary' -> explicit true
        new Error('rate limit exceeded'), // Contains 'rate limit' -> explicit true
        new Error('unknown service error'), // No patterns match -> default true
        new Error('anything else'), // No patterns match -> default true
        new Error('') // Empty message -> default true
      ]

      retryableErrors.forEach(error => {
        expect(processor.isRetryableErrorPublic(error)).toBe(true)
      })
    })

    it('should handle HTTP errors correctly', () => {
      const httpError500 = new Error('Server error') as any
      httpError500.name = 'HTTPError'
      httpError500.response = { status: 500 }

      const httpError400 = new Error('Client error') as any
      httpError400.name = 'HTTPError'
      httpError400.response = { status: 400 }

      // Production logic: HTTPError with 5xx status -> retryable, 4xx -> not retryable
      expect(processor.isRetryableErrorPublic(httpError500)).toBe(true) // 5xx are retryable
      expect(processor.isRetryableErrorPublic(httpError400)).toBe(false) // 4xx are not retryable
    })
  })

  describe('updateProgress', () => {
    it('should update job progress successfully', async () => {
      await processor['updateProgress'](testJob, 50, 'Half done')

      expect(testJob.progress).toHaveBeenCalledWith(50)
    })

    it('should handle progress update failures gracefully', async () => {
      testJob.progress = jest.fn().mockRejectedValue(new Error('Progress update failed'))

      // Should not throw
      await expect(processor['updateProgress'](testJob, 50)).resolves.toBeUndefined()
    })

    it('should log debug message with progress message', async () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'debug')

      await processor['updateProgress'](testJob, 75, 'Almost done')

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('75%')
      )
    })
  })

  describe('performance edge cases', () => {
    it('should handle extremely long processing times', async () => {
      processor.processingDelay = 1000

      const result = await processor.handleJob(testJob)

      expect(result.processingTime).toBeGreaterThanOrEqual(1000)
      expect(result.success).toBe(true)
    })

    it('should handle multiple rapid job executions', async () => {
      const jobs = Array(5).fill(0).map(() => 
        MockJobFactory.createJob(QueueTestDataFactory.createBaseJobData())
      )

      const results = await Promise.all(
        jobs.map(job => processor.handleJob(job))
      )

      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.processingTime).toBeGreaterThanOrEqual(0)
      })
    })
  })
})