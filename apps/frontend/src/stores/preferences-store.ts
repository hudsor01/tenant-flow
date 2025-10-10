import { DEFAULT_THEME_MODE } from '@/lib/theme-utils'
import type { ThemeMode } from '@repo/shared/types/domain'
import { createStore } from 'zustand/vanilla'

export type PreferencesState = {
	themeMode: ThemeMode
	setThemeMode: (mode: ThemeMode) => void
}

export const createPreferencesStore = (init?: Partial<PreferencesState>) =>
	createStore<PreferencesState>()(set => ({
		themeMode: init?.themeMode ?? DEFAULT_THEME_MODE,
		setThemeMode: mode => set({ themeMode: mode })
	}))
