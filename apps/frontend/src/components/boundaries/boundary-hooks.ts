/**
 * Pure hooks for Suspense boundaries
 * Separated from components to avoid react-refresh warnings
 */

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
    console.error(`[${context || 'Unknown'}]:`, error)
    
    // In production, you might want to send to error reporting service
    if (process.env.PROD) {
      // Example: sendToErrorReportingService(error, context)
    }
  }

  return { reportError }
}