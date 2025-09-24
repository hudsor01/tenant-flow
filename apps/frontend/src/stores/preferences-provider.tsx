'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useRef } from 'react'

import { useStore, type StoreApi } from 'zustand'

import {
	getStoredThemeMode,
	persistThemeMode,
	updateThemeMode
} from '@/lib/theme-utils'
import type { ThemeMode } from '@repo/shared'

import type { PreferencesState } from './preferences-store'
import { createPreferencesStore } from './preferences-store'

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
	const storeRef = useRef<StoreApi<PreferencesState> | null>(null)

	if (!storeRef.current) {
		storeRef.current = createPreferencesStore({ themeMode })
	}

	useEffect(() => {
		const store = storeRef.current
		if (!store) {
			return
		}

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
	}, [])

	const store = storeRef.current

	if (!store) {
		throw new Error(
			'PreferencesStoreProvider failed to initialise the preferences store.'
		)
	}

	return (
		<PreferencesStoreContext.Provider value={store}>
			{children}
		</PreferencesStoreContext.Provider>
	)
}

export const usePreferencesStore = <T,>(
	selector: (state: PreferencesState) => T
): T => {
	const store = useContext(PreferencesStoreContext)
	if (!store) {
		throw new Error('Missing PreferencesStoreProvider')
	}

	return useStore(store, selector)
}
