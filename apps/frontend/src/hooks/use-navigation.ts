/**
 * Navigation Store Hooks
 *
 * Provides React hooks for interacting with the navigation store.
 * Follows the project's pattern of providing hooks for store interactions.
 */

import { useNavigationStore } from '#stores/navigation-store'

/**
 * Hook to access navigation store state and actions
 */
export const useNavigation = () => {
	return useNavigationStore()
}

/**
 * Hook for mobile menu state and actions
 */
export const useMobileMenu = () => {
	const {
		isMobileMenuOpen,
		toggleMobileMenu,
		openMobileMenu,
		closeMobileMenu
	} = useNavigationStore()
	return { isMobileMenuOpen, toggleMobileMenu, openMobileMenu, closeMobileMenu }
}

/**
 * Hook for breadcrumb management
 */
export const useBreadcrumbs = () => {
	const { breadcrumbs, setBreadcrumbs, addBreadcrumb, clearBreadcrumbs } =
		useNavigationStore()
	return { breadcrumbs, setBreadcrumbs, addBreadcrumb, clearBreadcrumbs }
}

/**
 * Hook for navigation history
 */
export const useNavigationHistory = () => {
	const { navigationHistory, addToHistory, clearHistory, goBack, canGoBack } =
		useNavigationStore()
	return { navigationHistory, addToHistory, clearHistory, goBack, canGoBack }
}

/**
 * Hook for active route information
 */
export const useActiveRoute = () => {
	const { activeRoute, activeSection, setActiveRoute } = useNavigationStore()
	return { activeRoute, activeSection, setActiveRoute }
}
