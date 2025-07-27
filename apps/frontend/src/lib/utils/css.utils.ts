import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Error handling utility
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