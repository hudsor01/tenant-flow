import { DEFAULT_THEME_MODE } from '#lib/theme-utils'
import type { ThemeMode } from '@repo/shared/types/domain'
import { createStore } from 'zustand/vanilla'

/**
 * View types for different entities in the application
 * - properties: 'grid' (visual) | 'table' (data-dense)
 * - maintenance: 'kanban' (workflow) | 'table' (data-dense)
 * - leases/tenants: locked to 'table' (best practice per UX research)
 */
export type ViewPreferences = {
	properties: 'grid' | 'table'
	maintenance: 'kanban' | 'table'
}

export const DEFAULT_VIEW_PREFERENCES: ViewPreferences = {
	properties: 'grid', // Visual-first per UX research
	maintenance: 'kanban' // Workflow-driven per UX research
}

export type PreferencesState = {
	themeMode: ThemeMode
	viewPreferences: ViewPreferences
	setThemeMode: (mode: ThemeMode) => void
	setViewPreference: <K extends keyof ViewPreferences>(
		entity: K,
		view: ViewPreferences[K]
	) => void
}

export const createPreferencesStore = (init?: Partial<PreferencesState>) =>
	createStore<PreferencesState>()(set => ({
		themeMode: init?.themeMode ?? DEFAULT_THEME_MODE,
		viewPreferences: init?.viewPreferences ?? DEFAULT_VIEW_PREFERENCES,
		setThemeMode: mode => set({ themeMode: mode }),
		setViewPreference: (entity, view) =>
			set(state => ({
				viewPreferences: {
					...state.viewPreferences,
					[entity]: view
				}
			}))
	}))
