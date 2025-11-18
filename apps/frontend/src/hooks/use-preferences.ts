/**
 * Preferences Store Hooks
 *
 * Provides React hooks for interacting with the preferences store.
 * Manages theme mode and view preferences.
 */

import { useSyncExternalStore } from 'react'
import { createPreferencesStore } from '#stores/preferences-store'
import type { ViewPreferences } from '#stores/preferences-store'

// Create a singleton store instance
const preferencesStore = createPreferencesStore()

/**
 * Hook to access the complete preferences store
 */
export const usePreferences = () => {
	const state = useSyncExternalStore(
		preferencesStore.subscribe,
		preferencesStore.getState,
		preferencesStore.getState
	)

	return {
		...state,
		// Convenience getters
		themeMode: state.themeMode,
		viewPreferences: state.viewPreferences
	}
}

/**
 * Hook for theme management
 */
export const useTheme = () => {
	const { themeMode, setThemeMode } = usePreferences()
	return { themeMode, setThemeMode }
}

/**
 * Hook for view preferences management
 */
export const useViewPreferences = () => {
	const { viewPreferences, setViewPreference } = usePreferences()
	return { viewPreferences, setViewPreference }
}

/**
 * Hook for specific entity view preferences
 */
export const useEntityViewPreference = <K extends keyof ViewPreferences>(entity: K) => {
	const { viewPreferences, setViewPreference } = usePreferences()
	const currentView = viewPreferences[entity]

	return {
		view: currentView,
		setView: (view: ViewPreferences[K]) => setViewPreference(entity, view)
	}
}