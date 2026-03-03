/**
 * Error Boundary Hooks
 *
 * Provides React hooks for interacting with the error boundary store.
 * Follows the project's pattern of providing hooks for store interactions.
 */

import { useErrorBoundaryStore } from '#stores/error-boundary-store'

/**
 * Hook to access error boundary state and actions
 */
export const useErrorBoundary = () => {
	return useErrorBoundaryStore()
}

/**
 * Hook to check if the app is currently in an error state
 */
export const useIsInErrorState = () => {
	return useErrorBoundaryStore(state => state.isInErrorState)
}

/**
 * Hook to get the current error state
 */
export const useErrorState = () => {
	return useErrorBoundaryStore(state => state.errorState)
}
