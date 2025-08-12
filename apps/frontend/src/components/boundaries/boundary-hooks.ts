/**
 * Pure hooks for Suspense boundaries
 * Separated from components to avoid react-refresh warnings
 */

import { logger } from '@/lib/logger'

// Hook for components to trigger boundary reset
export function useBoundaryReset() {
  const reset = () => {
    // This will trigger error boundary reset
    window.location.reload()
  }

  return { reset }
}

// Hook for reporting errors to boundary
export function useErrorReporting() {
  const reportError = (error: Error, context?: string) => {
    logger.error(`[${context || 'Unknown'}]: ${error.message}`, error)
    
    // In production, you might want to send to error reporting service
    if (process.env.PROD) {
      // Example: sendToErrorReportingService(error, context)
    }
  }

  return { reportError }
}