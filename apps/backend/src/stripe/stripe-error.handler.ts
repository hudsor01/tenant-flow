import { Injectable, Logger } from '@nestjs/common'
import Stripe from 'stripe'
import { ExecuteContext, RetryConfig, ExecuteParams, AsyncWrapParams } from '@tenantflow/shared/types/stripe-error-handler'

interface NetworkError extends Error {
  code?: string
  status?: number
}

@Injectable()
export class StripeErrorHandler {
  private readonly logger = new Logger(StripeErrorHandler.name)
  
  private readonly defaultRetryConfig: Required<RetryConfig> = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000
  }

  /**
   * Execute a Stripe operation with retry logic and proper error handling
   */
  async executeWithRetry<T>(params: ExecuteParams<T>): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...params.retryConfig }
    let lastError: Error

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await params.execute()
        
        if (attempt > 1) {
          this.logger.warn(
            `${params.context.operation} succeeded on attempt ${attempt}/${config.maxAttempts}`
          )
        }
        
        return result
      } catch (error) {
        const errorObj = this.normalizeError(error)
        lastError = errorObj
        
        // Check if we should retry this error
        if (this.shouldRetry(errorObj) && attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config)
          
          this.logger.warn(
            `${params.context.operation} failed on attempt ${attempt}/${config.maxAttempts}, retrying in ${delay}ms: ${lastError.message}`
          )
          
          await this.delay(delay)
          continue
        }
        
        // Log the final failure
        this.logger.error(
          `${params.context.operation} failed after ${attempt} attempts`,
          {
            error: lastError.message,
            context: params.context,
            stripeErrorType: this.getStripeErrorType(this.normalizeError(error))
          }
        )
        
        throw this.transformError(this.normalizeError(error), params.context)
      }
    }

    throw this.transformError(lastError!, params.context)
  }

  /**
   * Wrap an async operation with error transformation (no retry)
   */
  async wrapAsync<T>(
    operation: () => Promise<T>,
    context: AsyncWrapParams
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      this.logger.error(`${context.operation} failed`, {
        error: (error as Error).message,
        context,
        stripeErrorType: this.getStripeErrorType(this.normalizeError(error))
      })
      
      throw this.transformError(this.normalizeError(error), context)
    }
  }

  /**
   * Wrap a synchronous operation with error transformation
   */
  wrapSync<T>(operation: () => T, context: AsyncWrapParams): T {
    try {
      return operation()
    } catch (error) {
      this.logger.error(`${context.operation} failed`, {
        error: (error as Error).message,
        context,
        stripeErrorType: this.getStripeErrorType(this.normalizeError(error))
      })
      
      throw this.transformError(this.normalizeError(error), context)
    }
  }

  /**
   * Normalize unknown error to proper error type
   */
  private normalizeError(error: unknown): Error | Stripe.errors.StripeError | NetworkError {
    if (error instanceof Stripe.errors.StripeError) {
      return error
    }
    if (error instanceof Error) {
      return error as Error | NetworkError
    }
    return new Error(String(error))
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: Error | Stripe.errors.StripeError | NetworkError): boolean {
    if (error instanceof Stripe.errors.StripeError) {
      switch (error.type) {
        case 'StripeAPIError':
        case 'StripeConnectionError':
        case 'StripeRateLimitError':
          return true
        case 'StripeCardError':
        case 'StripeInvalidRequestError':
        case 'StripeAuthenticationError':
        case 'StripePermissionError':
        case 'StripeIdempotencyError':
        case 'StripeInvalidGrantError':
          return false
        default:
          // For unknown Stripe errors, be conservative and don't retry
          return false
      }
    }
    
    // For network-level errors, retry
    const networkError = error as NetworkError
    if (networkError.code === 'ENOTFOUND' || networkError.code === 'ECONNRESET' || networkError.code === 'ETIMEDOUT') {
      return true
    }
    
    // For HTTP 5xx errors, retry
    if (networkError.status && networkError.status >= 500 && networkError.status < 600) {
      return true
    }
    
    return false
  }

  /**
   * Calculate delay for exponential backoff with jitter
   */
  private calculateDelay(attempt: number, config: Required<RetryConfig>): number {
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1)
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5) // 50-100% of calculated delay
    
    return Math.min(jitteredDelay, config.maxDelayMs)
  }

  /**
   * Transform Stripe errors into user-friendly errors
   */
  private transformError(error: Error | Stripe.errors.StripeError | NetworkError, context: ExecuteContext | AsyncWrapParams): Error {
    if (error instanceof Stripe.errors.StripeError) {
      const message = this.getUserFriendlyMessage(error)
      const transformedError = new Error(message)
      
      // Preserve original error properties for debugging
      Object.assign(transformedError, {
        originalError: error,
        stripeErrorType: error.type,
        stripeCode: error.code,
        stripeDeclineCode: (error as Stripe.errors.StripeCardError).decline_code,
        context
      })
      
      return transformedError
    }
    
    if (error instanceof Error) {
      return error
    }
    
    return new Error('Unknown payment processing error')
  }

  /**
   * Get user-friendly error messages for different Stripe error types
   */
  private getUserFriendlyMessage(error: Stripe.errors.StripeError): string {
    switch (error.type) {
      case 'StripeCardError':
        return this.getCardErrorMessage(error as Stripe.errors.StripeCardError)
      case 'StripeInvalidRequestError':
        return 'Invalid request. Please check your input and try again.'
      case 'StripeAPIError':
        return 'Payment service is temporarily unavailable. Please try again later.'
      case 'StripeConnectionError':
        return 'Connection error. Please check your internet connection and try again.'
      case 'StripeRateLimitError':
        return 'Too many requests. Please wait a moment and try again.'
      case 'StripeAuthenticationError':
        return 'Payment service authentication error. Please contact support.'
      case 'StripePermissionError':
        return 'Payment service permission error. Please contact support.'
      case 'StripeIdempotencyError':
        return 'Duplicate request detected. Please try again with a new request.'
      case 'StripeInvalidGrantError':
        return 'Payment authorization error. Please contact support.'
      default:
        return error.message || 'Payment processing error occurred.'
    }
  }

  /**
   * Get specific messages for card errors
   */
  private getCardErrorMessage(error: Stripe.errors.StripeCardError): string {
    const declineCode = error.decline_code
    
    if (declineCode) {
      switch (declineCode) {
        case 'insufficient_funds':
          return 'Your card has insufficient funds.'
        case 'card_declined':
          return 'Your card was declined. Please try a different card.'
        case 'expired_card':
          return 'Your card has expired. Please use a different card.'
        case 'incorrect_cvc':
          return 'Your card\'s security code is incorrect.'
        case 'processing_error':
          return 'An error occurred processing your card. Please try again.'
        case 'incorrect_number':
          return 'Your card number is incorrect.'
        default:
          return error.message || 'Your card was declined.'
      }
    }
    
    return error.message || 'Your payment method was declined.'
  }

  /**
   * Get the Stripe error type for logging
   */
  private getStripeErrorType(error: Error | Stripe.errors.StripeError | NetworkError): string | undefined {
    if (error instanceof Stripe.errors.StripeError) {
      return error.type
    }
    return undefined
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}