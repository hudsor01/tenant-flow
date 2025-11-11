/**
 * Toast Store Hooks
 *
 * Provides React hooks for interacting with the toast store.
 * Follows the project's pattern of providing hooks for store interactions.
 */

import { useToastStore } from '#stores/toast-store'

/**
 * Hook to access toast store state and actions
 */
export const useToast = () => {
	return useToastStore()
}

/**
 * Hook to add a toast notification
 */
export const useAddToast = () => {
	const { addToast } = useToastStore()
	return addToast
}

/**
 * Hook to remove a toast notification
 */
export const useRemoveToast = () => {
	const { removeToast } = useToastStore()
	return removeToast
}

/**
 * Hook to clear toasts (optionally by category)
 */
export const useClearToasts = () => {
	const { clearToasts, clearAllToasts } = useToastStore()
	return { clearToasts, clearAllToasts }
}

/**
 * Hook to get toast state
 */
export const useToastState = () => {
	return useToastStore(state => ({
		hasToasts: state.hasToasts,
		toastCount: state.toastCount,
		hasErrors: state.hasErrors,
		hasWarnings: state.hasWarnings,
		toasts: state.toasts
	}))
}

/**
 * Hook to get toasts by category
 */
export const useToastsByCategory = (category: string) => {
	return useToastStore(state => state.getToastsByCategory(category))
}
