/**
 * Toast Store Hooks
 *
 * Provides React hooks for interacting with the toast store.
 */

import { useToastStore } from '#stores/toast-store'

/**
 * Hook to access toast store state and actions
 */
export const useToast = () => {
	return useToastStore()
}
