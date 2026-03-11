/**
 * Error Boundary Hooks
 *
 * Provides React hooks for interacting with the error boundary store.
 */

import { useErrorBoundaryStore } from '#stores/error-boundary-store'

/**
 * Hook to access error boundary state and actions
 */
export const useErrorBoundary = () => {
	return useErrorBoundaryStore()
}
