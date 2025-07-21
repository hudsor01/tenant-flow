import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract user-friendly error message from API error
 * @deprecated Use classifyError from './error-handling' for comprehensive error handling
 */
export function handleApiError(error: unknown): string {
  // Re-export the more comprehensive error handling
  const { classifyError } = require('./error-handling')
  const classified = classifyError(error)
  return classified.userMessage || classified.message
}
