/**
 * Error handling utilities
 * Following SOLID principles - Single Responsibility
 */

export function handleApiError(error: Error): string {
  // Handle common API error messages
  if (error.message) {
    // Parse JSON error responses if applicable
    try {
      const parsed = JSON.parse(error.message)
      if (parsed.message) {
        return parsed.message
      }
    } catch {
      // Not JSON, return the original message
    }
    
    // Handle common error patterns
    if (error.message.includes('401')) {
      return 'Authentication required. Please log in again.'
    }
    if (error.message.includes('403')) {
      return 'Access denied. You do not have permission to perform this action.'
    }
    if (error.message.includes('404')) {
      return 'The requested resource was not found.'
    }
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.'
    }
    
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('401') || error.message.includes('403')
  }
  return false
}

export function isNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('404')
  }
  return false
}

export function isServerError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('500') || error.message.includes('502') || error.message.includes('503')
  }
  return false
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return handleApiError(error)
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred. Please try again.'
}