/**
 * Layout Store Hooks
 *
 * Provides React hooks for interacting with the layout store.
 * Manages user layout preferences, grid configurations, and responsive behavior.
 */

import { useLayoutStore } from '#stores/layout-store'

/**
 * Hook to access the complete layout store
 */
export const useLayout = () => {
	return useLayoutStore()
}

/**
 * Hook for sidebar management
 */
export const useSidebar = () => {
	const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useLayoutStore()
	return { sidebarCollapsed, toggleSidebar, setSidebarCollapsed }
}

/**
 * Hook for panel size management
 */
export const usePanelSizes = () => {
	const { panelSizes, updatePanelSize, resetPanelSizes } = useLayoutStore()
	return { panelSizes, updatePanelSize, resetPanelSizes }
}

/**
 * Hook for grid layout management
 */
export const useGridLayout = () => {
	const { gridLayouts, activeGridLayout, saveGridLayout, setActiveGridLayout, deleteGridLayout } = useLayoutStore()
	return { gridLayouts, activeGridLayout, saveGridLayout, setActiveGridLayout, deleteGridLayout }
}

/**
 * Hook for view preferences
 */
export const useViewPreferences = () => {
	const { viewPreferences, setViewPreference, resetToDefaults } = useLayoutStore()
	return { viewPreferences, setViewPreference, resetToDefaults }
}