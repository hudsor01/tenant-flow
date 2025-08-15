import { Injectable, Logger } from '@nestjs/common'
import type { StripeError as StripeRawError } from '@repo/shared/types/stripe'

interface NetworkError extends Error {
  code?: string
  status?: number
}

@Injectable()
export class StripeErrorHandler {
  private readonly logger = new Logger(StripeErrorHandler.name)
  
  /**
   * Normalize different types of errors to a standard Error object
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error
    }
    
    if (typeof error === 'string') {
      return new Error(error)
    }
    
    return new Error(`Unknown error: ${String(error)}`)
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: Error): boolean {
    const stripeError = error as unknown as StripeRawError
    
    // Retry on rate limit errors
    if (stripeError?.type === 'rate_limit_error') {
      return true
    }
    
    // Retry on connection errors
    const networkError = error as NetworkError
    if (networkError?.code === 'ECONNRESET' || networkError?.code === 'ETIMEDOUT') {
      return true
    }
    
    // Don't retry on other Stripe errors
    return false
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(attempt: number, baseDelayMs = 1000, maxDelayMs = 10000): number {
    const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
    // Add some jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5)
    return Math.round(exponentialDelay + jitter)
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Execute with retry using configuration object
   */
  async executeWithRetry<T>(config: {
    operation: () => Promise<T>
    metadata?: Record<string, unknown>
    maxAttempts?: number
  }): Promise<T> {
    return this.wrapAsync(
      config.operation,
      config.metadata?.operation as string || 'stripe-operation',
      config.maxAttempts || 3
    )
  }

  /**
   * Simple sync wrapper
   */
  wrapSync<T>(operation: () => T, operationName = 'stripe-operation'): T {
    try {
      return operation()
    } catch (error) {
      const errorObj = this.normalizeError(error)
      this.logger.error(`${operationName} failed: ${errorObj.message}`)
      throw errorObj
    }
  }

  /**
   * Simple async wrapper with basic retry logic
   */
  async wrapAsync<T>(
    operation: () => Promise<T>,
    operationName = 'stripe-operation',
    maxAttempts = 3
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error')

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation()
        
        if (attempt > 1) {
          this.logger.warn(`${operationName} succeeded on attempt ${attempt}/${maxAttempts}`)
        }
        
        return result
      } catch (error) {
        const errorObj = this.normalizeError(error)
        lastError = errorObj
        
        // Check if we should retry this error
        if (this.shouldRetry(errorObj) && attempt < maxAttempts) {
          const delay = this.calculateDelay(attempt)
          
          this.logger.warn(
            `${operationName} failed on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms: ${lastError.message}`
          )
          
          await this.delay(delay)
          continue
        }
        
        // Don't retry - either not retryable or max attempts reached
        this.logger.error(`${operationName} failed after ${attempt} attempts: ${lastError.message}`)
        throw lastError
      }
    }

    throw lastError
  }
}
