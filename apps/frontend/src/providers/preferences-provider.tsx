'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { useStore, type StoreApi } from 'zustand'
import {
	getStoredThemeMode,
	persistThemeMode,
	updateThemeMode
} from '@/lib/theme-utils'
import type { ThemeMode } from '@repo/shared/types/domain'
import type { PreferencesState } from '@/stores/preferences-store'
import { createPreferencesStore } from '@/stores/preferences-store'

const PreferencesStoreContext =
	createContext<StoreApi<PreferencesState> | null>(null)

const resolveSystemTheme = () => {
	if (typeof window === 'undefined') {
		return 'light'
	}

	return window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light'
}

const applyTheme = (mode: ThemeMode) => {
	const resolved = mode === 'system' ? resolveSystemTheme() : mode
	updateThemeMode(resolved, mode)
}

interface PreferencesProviderProps {
	children: ReactNode
	themeMode: PreferencesState['themeMode']
}

export const PreferencesStoreProvider = ({
	children,
	themeMode
}: PreferencesProviderProps) => {
	const [store] = useState(() => createPreferencesStore({ themeMode }))

	useEffect(() => {

		const initialTheme = store.getState().themeMode
		applyTheme(initialTheme)
		persistThemeMode(initialTheme)

		const storedPreference = getStoredThemeMode()
		if (storedPreference && storedPreference !== initialTheme) {
			store.getState().setThemeMode(storedPreference)
		}

		let previousThemeMode = initialTheme

		const unsubscribe = store.subscribe(state => {
			const currentThemeMode = state.themeMode
			if (currentThemeMode !== previousThemeMode) {
				applyTheme(currentThemeMode)
				persistThemeMode(currentThemeMode)
				previousThemeMode = currentThemeMode
			}
		})

		if (typeof window === 'undefined') {
			return unsubscribe
		}

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		const handleSystemChange = (event: MediaQueryListEvent) => {
			if (store.getState().themeMode === 'system') {
				const resolved = event.matches ? 'dark' : 'light'
				updateThemeMode(resolved, 'system')
			}
		}

		mediaQuery.addEventListener('change', handleSystemChange)

		return () => {
			unsubscribe()
			mediaQuery.removeEventListener('change', handleSystemChange)
		}
	}, [store])

	return (
		<PreferencesStoreContext.Provider value={store}>
			{children}
		</PreferencesStoreContext.Provider>
	)
}

export function usePreferencesStore<T>(
	selector: (state: PreferencesState) => T
): T {
	const store = useContext(PreferencesStoreContext)
	if (!store) {
		throw new Error('Missing PreferencesStoreProvider')
	}

	return useStore(store, selector)
}
