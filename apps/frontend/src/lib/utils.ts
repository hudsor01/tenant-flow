import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract user-friendly error message from API error
 */
export function handleApiError(error: Error | Record<string, unknown>): string {
  // Handle string errors
  if (typeof error === 'string') {
    return error
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message
  }

  // Handle objects with message property
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const errorObj = error as { message: string }
    if (typeof errorObj.message === 'string') {
      return errorObj.message
    }
  }

  // Handle HTTP response errors
  if (typeof error === 'object' && error !== null) {
    // Check for response data
    if ('response' in error) {
      const responseError = error as { response?: { data?: { message?: string } } }
      if (responseError.response?.data?.message) {
        return responseError.response.data.message
      }
    }
    
    // Check for status codes
    if ('status' in error) {
      const statusError = error as { status?: number }
      switch (statusError.status) {
        case 400:
          return 'Invalid request. Please check your input.'
        case 401:
          return 'Authentication required. Please log in.'
        case 403:
          return 'You do not have permission to perform this action.'
        case 404:
          return 'The requested resource was not found.'
        case 429:
          return 'Too many requests. Please wait and try again.'
        case 500:
          return 'Server error. Please try again later.'
        default:
          return `Request failed with status ${statusError.status}`
      }
    }
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.'
}
