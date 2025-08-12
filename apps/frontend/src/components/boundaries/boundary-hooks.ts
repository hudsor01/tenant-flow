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
    logger.error(`[${context || 'Unknown'}]:`, error instanceof Error ? error : new Error(String(error)), { component: "components_boundaries_boundary_hooks.ts" })
    
    // In production, you might want to send to error reporting service
    if (process.env.PROD) {
      // Example: sendToErrorReportingService(error, context)
    }
  }

  return { reportError }
}