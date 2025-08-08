/**
 * Advanced Error Handling for Route Loaders
 *
 * Provides comprehensive error handling, retry logic, and fallback strategies
 * for route loaders with proper user feedback and recovery mechanisms.
 */

import type { LoaderError } from '@repo/shared'
import { toast } from 'sonner'

// Error classification
export const ERROR_TYPES = {
  AUTHENTICATION: 'auth',
  PERMISSION: 'permission',
  NETWORK: 'network',
  VALIDATION: 'validation',
  SUBSCRIPTION: 'subscription',
  RATE_LIMIT: 'rate_limit',
  SERVER: 'server',
  UNKNOWN: 'unknown'
} as const

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// Enhanced error information
export interface EnhancedError extends LoaderError {
  // Core error properties (explicitly defined for clarity)
  type: string
  statusCode?: number
  retryable: boolean
  
  // Enhanced properties
  severity: ErrorSeverity
  userMessage: string
  technicalMessage: string
  timestamp: Date
  stackTrace?: string
  context?: Record<string, unknown>
  suggestions?: string[]
}

/**
 * Enhanced error handler with classification and user feedback
 */
export class LoaderErrorHandler {
  private errorCounts = new Map<string, number>()
  private lastErrorTime = new Map<string, number>()

  /**
   * Handle and classify errors from loaders
   */
  handleError(error: unknown, context = 'loader'): EnhancedError {
    const enhancedError = this.classifyError(error, context)

    // Track error frequency
    this.trackError(enhancedError)

    // Provide user feedback based on severity
    this.notifyUser(enhancedError)

    // Log for monitoring
    this.logError(enhancedError)

    return enhancedError
  }

  /**
   * Classify error type and severity
   */
  private classifyError(error: unknown, context: string): EnhancedError {
    const timestamp = new Date()
    let enhancedError: Partial<EnhancedError> = {
      timestamp,
      context: { source: context }
    }

    // Handle Axios errors
    if (this.isAxiosError(error)) {
      const status = error.response?.status
      const message = error.response?.data?.message || error.message

      switch (status) {
        case 401:
          enhancedError = {
            ...enhancedError,
            type: ERROR_TYPES.AUTHENTICATION,
            severity: 'high',
            userMessage: 'Please log in to continue',
            technicalMessage: `Authentication failed: ${message}`,
            retryable: false,
            suggestions: ['Log in again', 'Check your internet connection']
          }
          break

        case 403:
          enhancedError = {
            ...enhancedError,
            type: ERROR_TYPES.PERMISSION,
            severity: 'high',
            userMessage: 'You don\'t have permission to access this resource',
            technicalMessage: `Permission denied: ${message}`,
            retryable: false,
            suggestions: ['Contact your administrator', 'Upgrade your subscription']
          }
          break

        case 429:
          enhancedError = {
            ...enhancedError,
            type: ERROR_TYPES.NETWORK,
            severity: 'medium',
            userMessage: 'Too many requests. Please wait a moment and try again',
            technicalMessage: `Rate limit exceeded: ${message}`,
            retryable: true,
            suggestions: ['Wait a few minutes', 'Reduce request frequency']
          }
          break

        case 402:
          enhancedError = {
            ...enhancedError,
            type: ERROR_TYPES.SUBSCRIPTION,
            severity: 'high',
            userMessage: 'Subscription upgrade required for this feature',
            technicalMessage: `Subscription limit: ${message}`,
            retryable: false,
            suggestions: ['Upgrade your subscription', 'Contact support']
          }
          break

        case 400:
        case 422:
          enhancedError = {
            ...enhancedError,
            type: ERROR_TYPES.VALIDATION,
            severity: 'medium',
            userMessage: 'Invalid request. Please check your input',
            technicalMessage: `Validation error: ${message}`,
            retryable: false,
            suggestions: ['Check your input', 'Try refreshing the page']
          }
          break

        case 500:
        case 502:
        case 503:
        case 504:
          enhancedError = {
            ...enhancedError,
            type: ERROR_TYPES.UNKNOWN,
            severity: 'high',
            userMessage: 'Server error. We\'re working to fix this',
            technicalMessage: `Server error (${status}): ${message}`,
            retryable: true,
            suggestions: ['Try again in a few minutes', 'Contact support if the problem persists']
          }
          break

        default:
          if (!status) {
            // Network error
            enhancedError = {
              ...enhancedError,
              type: ERROR_TYPES.NETWORK,
              severity: 'medium',
              userMessage: 'Network connection problem',
              technicalMessage: `Network error: ${message}`,
              retryable: true,
              suggestions: ['Check your internet connection', 'Try again']
            }
          } else {
            enhancedError = {
              ...enhancedError,
              type: ERROR_TYPES.UNKNOWN,
              severity: 'medium',
              userMessage: 'An unexpected error occurred',
              technicalMessage: `HTTP ${status}: ${message}`,
              retryable: true,
              suggestions: ['Try refreshing the page', 'Contact support']
            }
          }
      }

      enhancedError.statusCode = status
    }
    // Handle other error types
    else if (error instanceof Error) {
      enhancedError = {
        ...enhancedError,
        type: ERROR_TYPES.UNKNOWN,
        severity: 'medium',
        userMessage: 'An unexpected error occurred',
        technicalMessage: error.message,
        retryable: true,
        stackTrace: error.stack,
        suggestions: ['Try refreshing the page', 'Contact support']
      }
    }
    // Handle unknown errors
    else {
      enhancedError = {
        ...enhancedError,
        type: ERROR_TYPES.UNKNOWN,
        severity: 'low',
        userMessage: 'Something went wrong',
        technicalMessage: String(error),
        retryable: true,
        suggestions: ['Try again', 'Refresh the page']
      }
    }

    return {
      message: enhancedError.technicalMessage || 'Unknown error',
      code: enhancedError.type,
      ...enhancedError
    } as EnhancedError
  }

  /**
   * Track error frequency for circuit breaker pattern
   */
  private trackError(error: EnhancedError): void {
    const key = `${error.type}-${error.context?.source || 'unknown'}`
    const now = Date.now()

    // Reset count if last error was more than 5 minutes ago
    const lastTime = this.lastErrorTime.get(key) || 0
    if (now - lastTime > 5 * 60 * 1000) {
      this.errorCounts.set(key, 0)
    }

    // Increment count
    const count = (this.errorCounts.get(key) || 0) + 1
    this.errorCounts.set(key, count)
    this.lastErrorTime.set(key, now)

    // Escalate severity for repeated errors
    if (count >= 3 && error.severity !== 'critical') {
      error.severity = 'high'
      error.suggestions?.unshift('Multiple errors detected - try refreshing the page')
    }

    if (count >= 5) {
      error.severity = 'critical'
      error.suggestions = ['Critical error pattern detected', 'Please contact support']
    }
  }

  /**
   * Provide user feedback based on error severity
   */
  private notifyUser(error: EnhancedError): void {
    switch (error.severity) {
      case 'critical':
        toast.error(error.userMessage, {
          description: 'Critical error - please contact support',
          duration: 10000,
          action: {
            label: 'Contact Support',
            onClick: () => window.open('/contact', '_blank')
          }
        })
        break

      case 'high':
        toast.error(error.userMessage, {
          description: error.suggestions?.[0],
          duration: 8000
        })
        break

      case 'medium':
        toast.warning(error.userMessage, {
          description: error.suggestions?.[0],
          duration: 5000
        })
        break

      case 'low':
        // Don't show toast for low severity errors
        console.warn('Low severity error:', error.userMessage)
        break
    }
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(error: EnhancedError): void {
    const logData = {
      type: error.type,
      severity: error.severity,
      message: error.technicalMessage,
      context: error.context,
      timestamp: error.timestamp.toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId()
    }

    // Log to console in development
    if (process.env.DEV) {
      console.warn(`🚨 Loader Error [${error.severity.toUpperCase()}]`)
      console.error('Message:', error.technicalMessage)
      console.warn('Context:', error.context)
      console.warn('Suggestions:', error.suggestions)
      if (error.stackTrace) {
        console.error('Stack:', error.stackTrace)
      }
      console.warn('--- End Loader Error ---')
    }

    // Send to monitoring service in production
    if (process.env.PROD && error.severity !== 'low') {
      this.sendToMonitoring(logData)
    }
  }

  /**
   * Create retry function with exponential backoff
   */
  createRetryFn = <T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> => {
    const executeWithRetry = async (): Promise<T> => {
      let lastError: unknown

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await fn()
          return result
        } catch (error) {
          lastError = error

          // Don't retry non-retryable errors
          const enhancedError = this.classifyError(error, 'retry')
          if (!enhancedError.retryable || attempt === maxRetries) {
            throw lastError
          }

          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      throw lastError
    }

    return executeWithRetry()
  }

  /**
   * Get circuit breaker status for error type
   */
  getCircuitBreakerStatus(errorType: string, context: string): {
    isOpen: boolean
    errorCount: number
    suggestion?: string
  } {
    const key = `${errorType}-${context}`
    const count = this.errorCounts.get(key) || 0
    const isOpen = count >= 5

    return {
      isOpen,
      errorCount: count,
      suggestion: isOpen ? 'Circuit breaker open - service temporarily unavailable' : undefined
    }
  }

  /**
   * Reset circuit breaker for error type
   */
  resetCircuitBreaker(errorType: string, context: string): void {
    const key = `${errorType}-${context}`
    this.errorCounts.delete(key)
    this.lastErrorTime.delete(key)
  }

  // Helper methods
  private isAxiosError(error: unknown): error is { response?: { status?: number; data?: { message?: string } }; message: string } {
    return !!(error && typeof error === 'object' && 'response' in error)
  }

  private getCurrentUserId(): string | undefined {
    // This would be implemented to get current user ID
    return undefined
  }

  private sendToMonitoring(logData: Record<string, unknown>): void {
    // This would send to monitoring service like Sentry, LogRocket, etc.
    console.warn('Would send to monitoring:', logData)
  }
}

// Global error handler instance
export const loaderErrorHandler = new LoaderErrorHandler()

// Utility functions for common error scenarios
export const errorUtils = {
  /**
   * Handle authentication errors
   */
  handleAuthError: (error: unknown) => {
    const enhancedError = loaderErrorHandler.handleError(error, 'auth')

    if (enhancedError.type === ERROR_TYPES.AUTHENTICATION) {
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
    }

    return enhancedError
  },

  /**
   * Handle subscription limit errors
   */
  handleSubscriptionError: (error: unknown) => {
    const enhancedError = loaderErrorHandler.handleError(error, 'subscription')

    if (enhancedError.type === ERROR_TYPES.SUBSCRIPTION) {
      // Show upgrade modal or redirect to pricing
      setTimeout(() => {
        window.location.href = '/pricing'
      }, 3000)
    }

    return enhancedError
  },

  /**
   * Handle network errors with offline detection
   */
  handleNetworkError: (error: unknown) => {
    const enhancedError = loaderErrorHandler.handleError(error, 'network')

    if (enhancedError.type === ERROR_TYPES.NETWORK) {
      // Check if user is offline
      if (!navigator.onLine) {
        enhancedError.userMessage = 'You appear to be offline'
        enhancedError.suggestions = ['Check your internet connection', 'Try again when back online']

        toast.error('You appear to be offline', {
          description: 'Some features may not work until you reconnect',
          duration: 10000
        })
      }
    }

    return enhancedError
  }
}

export default loaderErrorHandler
