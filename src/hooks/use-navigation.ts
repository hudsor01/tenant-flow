/**
 * Navigation Store Hooks
 *
 * Provides React hooks for interacting with the navigation store.
 */

import { useNavigationStore } from '#stores/navigation-store'

/**
 * Hook to access navigation store state and actions
 */
export const useNavigation = () => {
	return useNavigationStore()
}
