'use client'

import { createContext, useContext, useRef } from 'react'

import { useStore, type StoreApi } from 'zustand'

import type { PreferencesState } from './preferences-store'
import { createPreferencesStore } from './preferences-store'

const PreferencesStoreContext =
	createContext<StoreApi<PreferencesState> | null>(null)

export const PreferencesStoreProvider = ({
	children,
	themeMode
}: {
	children: React.ReactNode
	themeMode: PreferencesState['themeMode']
}) => {
	const storeRef = useRef<StoreApi<PreferencesState> | null>(null)

	storeRef.current ??= createPreferencesStore({ themeMode })

	return (
		<PreferencesStoreContext.Provider value={storeRef.current}>
			{children}
		</PreferencesStoreContext.Provider>
	)
}

export const usePreferencesStore = <T,>(
	selector: (state: PreferencesState) => T
): T => {
	const store = useContext(PreferencesStoreContext)
	if (!store) throw new Error('Missing PreferencesStoreProvider')
	return useStore(store, selector)
}
