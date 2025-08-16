import { Injectable } from '@nestjs/common'

/**
 * Centralized error classification service following official Bull patterns
 * Single source of truth for retry logic - eliminates ALL duplication
 */
@Injectable()
export class ErrorClassificationService {
  /**
   * Determines if an error should trigger a retry based on official Bull best practices
   * This is THE ONLY implementation - used by ALL processors and services
   */
  static isRetryableError(error: Error): boolean {
    // Check error name and type first (more reliable than message checking)
    if (error.name === 'ValidationError' || error.constructor.name === 'ValidationError') {
      return false
    }

    const message = error.message.toLowerCase()
    
    // Don't retry validation errors
    if (message.includes('validation') || 
        message.includes('invalid') || 
        message.includes('required')) {
      return false
    }

    // Don't retry authentication/authorization errors
    if (message.includes('unauthorized') || 
        message.includes('forbidden') || 
        message.includes('access denied')) {
      return false
    }

    // Don't retry malformed data errors
    if (message.includes('malformed') || 
        message.includes('parse error') || 
        message.includes('syntax error')) {
      return false
    }

    // Retry network, timeout, and temporary service errors
    if (message.includes('timeout') || 
        message.includes('network') || 
        message.includes('connection') || 
        message.includes('temporary') || 
        message.includes('rate limit')) {
      return true
    }

    // Retry 5xx HTTP errors but not 4xx
    if (error.name === 'HTTPError') {
      const httpError = error as Error & { response?: { status?: number } }
      if (httpError.response?.status) {
        return httpError.response.status >= 500
      }
    }

    // Default to retryable for unknown errors
    return true
  }
}