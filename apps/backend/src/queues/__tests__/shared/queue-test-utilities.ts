import type { Job } from 'bull'
import { Test, type TestingModule } from '@nestjs/testing'
import { getQueueToken, BullModule } from '@nestjs/bull'
import type { Queue } from 'bull'
import type { EmailJobData, PaymentJobData, BaseJobData } from '../../types/job.interfaces'
import type { ProcessorResult } from '../../base/base.processor'

/**
 * Shared test utilities for queue infrastructure
 * Following DRY principles to avoid test code duplication
 */

// Test data factories
export class QueueTestDataFactory {
  static createBaseJobData(overrides: Partial<BaseJobData> = {}): BaseJobData {
    return {
      organizationId: 'test-org-123',
      userId: 'test-user-456',
      correlationId: 'test-correlation-789',
      timestamp: new Date().toISOString(),
      metadata: { test: true },
      ...overrides
    }
  }

  static createEmailJobData(overrides: Partial<EmailJobData> = {}): EmailJobData {
    return {
      ...this.createBaseJobData(),
      to: ['test@example.com'],
      template: 'welcome',
      data: { name: 'Test User' },
      priority: 'normal',
      ...overrides
    }
  }

  static createPaymentJobData(overrides: Partial<PaymentJobData> = {}): PaymentJobData {
    return {
      ...this.createBaseJobData(),
      type: 'charge',
      paymentId: 'pi_test_123',
      amount: 1000,
      currency: 'usd',
      customerId: 'cus_test_456',
      idempotencyKey: 'idem_test_789',
      ...overrides
    }
  }

  static createProcessorResult(overrides: Partial<ProcessorResult> = {}): ProcessorResult {
    return {
      success: true,
      data: { test: 'result' },
      processingTime: 150,
      timestamp: new Date(),
      ...overrides
    }
  }
}

// Mock job factory
export class MockJobFactory {
  static createJob<T>(data: T, overrides: Partial<Job<T>> = {}): Job<T> {
    const job = {
      id: Math.floor(Math.random() * 10000),
      data,
      attemptsMade: 0,
      progress: jest.fn().mockResolvedValue(undefined) as MockedFunction<(progress: number) => Promise<void>>,
      queue: {
        name: 'test-queue'
      },
      ...overrides
    } as unknown as Job<T>

    return job
  }

  static createEmailJob(data?: Partial<EmailJobData>): Job<EmailJobData> {
    return this.createJob(QueueTestDataFactory.createEmailJobData(data), {
      queue: { name: 'email' }
    })
  }

  static createPaymentJob(data?: Partial<PaymentJobData>): Job<PaymentJobData> {
    return this.createJob(QueueTestDataFactory.createPaymentJobData(data), {
      queue: { name: 'payments' }
    })
  }

  static createFailedJob<T>(data: T, attemptsMade = 2): Job<T> {
    return this.createJob(data, { attemptsMade })
  }
}

// Mock queue factory
export class MockQueueFactory {
  static createQueue(name = 'test-queue'): Queue & { [K in keyof Queue]: MockedFunction<Queue[K]> } {
    return {
      name,
      add: jest.fn().mockResolvedValue({ id: 123 }),
      addBulk: jest.fn().mockResolvedValue([{ id: 123 }, { id: 124 }]),
      getWaitingCount: jest.fn().mockResolvedValue(5),
      getActiveCount: jest.fn().mockResolvedValue(2),
      getCompletedCount: jest.fn().mockResolvedValue(100),
      getFailedCount: jest.fn().mockResolvedValue(3),
      getDelayedCount: jest.fn().mockResolvedValue(1),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      clean: jest.fn().mockResolvedValue(10),
      close: jest.fn().mockResolvedValue(undefined)
    } as unknown as Queue & { [K in keyof Queue]: MockedFunction<Queue[K]> }
  }

  static createQueueProvider(queueName: string) {
    return {
      provide: getQueueToken(queueName),
      useValue: this.createQueue(queueName)
    }
  }
}

// Error factory for consistent test errors
export class TestErrorFactory {
  static createValidationError(message = 'Validation failed'): Error {
    const error = new Error(message)
    error.name = 'ValidationError'
    return error
  }

  static createNetworkError(message = 'Network timeout'): Error {
    const error = new Error(message)
    error.name = 'NetworkError'
    return error
  }

  static createStripeError(message = 'Payment failed', code = 'card_declined'): Error {
    const error = new Error(message) as Error & { code?: string }
    error.name = 'StripeError'
    error.code = code
    return error
  }

  static createRetryableError(message = 'Temporary service problem'): Error {
    const error = new Error(message)
    error.name = 'ServiceUnavailableError'
    return error
  }

  static createNonRetryableError(message = 'Invalid request'): Error {
    const error = new Error(message)
    error.name = 'BadRequestError'
    return error
  }
}

// Test module builder for consistent setup
export class QueueTestModuleBuilder {
  private providers: unknown[] = []
  private imports: unknown[] = []

  static create(): QueueTestModuleBuilder {
    return new QueueTestModuleBuilder()
  }

  withEmailQueue(): this {
    this.providers.push(MockQueueFactory.createQueueProvider('email'))
    return this
  }

  withPaymentQueue(): this {
    this.providers.push(MockQueueFactory.createQueueProvider('payments'))
    return this
  }

  withAllQueues(): this {
    return this.withEmailQueue().withPaymentQueue()
  }

  withBullModule(): this {
    this.imports.push(
      BullModule.forRoot({
        redis: { host: 'localhost', port: 6379 }
      })
    )
    return this
  }

  withProvider(provider: unknown): this {
    this.providers.push(provider)
    return this
  }

  withImport(importModule: unknown): this {
    this.imports.push(importModule)
    return this
  }

  async build(): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: this.imports,
      providers: this.providers
    }).compile()
  }
}

// Assertion helpers
export class QueueTestAssertions {
  static expectJobProgress(job: Job<unknown>, expectedCalls: number): void {
    expect(job.progress).toHaveBeenCalledTimes(expectedCalls)
  }

  static expectJobProgressWithValue(job: Job<unknown>, value: number, message?: string): void {
    if (message) {
      expect(job.progress).toHaveBeenCalledWith(value)
    } else {
      expect(job.progress).toHaveBeenCalledWith(value)
    }
  }

  static expectProcessorResult(
    result: ProcessorResult,
    expected: Partial<ProcessorResult>
  ): void {
    expect(result.success).toBe(expected.success)
    if (expected.error !== undefined) {
      expect(result.error).toBeDefined()
    }
    if (expected.data !== undefined) {
      expect(result.data).toEqual(expected.data)
    }
    expect(result.processingTime).toBeGreaterThanOrEqual(0)
    expect(result.timestamp).toBeInstanceOf(Date)
  }

  static expectQueueOperation(
    queue: Queue & { [K in keyof Queue]: MockedFunction<Queue[K]> },
    operation: keyof Queue,
    times = 1
  ): void {
    expect(queue[operation]).toHaveBeenCalledTimes(times)
  }

  static expectQueueStats(stats: Record<string, unknown>, expected: Partial<Record<string, unknown>>): void {
    Object.keys(expected).forEach(key => {
      expect(stats[key]).toBe(expected[key])
    })
  }
}

// Timing utilities for async testing
export class QueueTestTiming {
  static async waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async waitForJobCompletion(): Promise<void> {
    return this.waitFor(10) // Small delay for async operations
  }

  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = Date.now()
    const result = await fn()
    const time = Date.now() - start
    return { result, time }
  }
}

// Test environment setup
export class QueueTestEnvironment {
  static setupProcessEnv(): void {
    process.env.NODE_ENV = 'test'
    process.env.REDIS_HOST = 'localhost'
    process.env.REDIS_PORT = '6379'
  }

  static cleanupProcessEnv(): void {
    delete process.env.NODE_ENV
    delete process.env.REDIS_HOST
    delete process.env.REDIS_PORT
  }

  static setupTestTimeout(): void {
    if (typeof jest !== 'undefined' && jest.setTimeout) {
      jest.setTimeout(10000) // 10 seconds for queue operations
    }
  }
}