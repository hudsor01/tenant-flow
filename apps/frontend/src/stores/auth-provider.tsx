'use client'

import { createClient } from '@/utils/supabase/client'
import { logger } from '@repo/shared'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useRef } from 'react'
import { type StoreApi } from 'zustand'
import type { AuthState } from './auth-store'
import { createAuthStore } from './auth-store'

const AuthStoreContext = createContext<StoreApi<AuthState> | null>(null)

// Create browser client for authentication
const supabaseClient = createClient()

export const AuthStoreProvider = ({
	children
}: {
	children: React.ReactNode
}) => {
	const storeRef = useRef<StoreApi<AuthState> | null>(null)

	storeRef.current ??= createAuthStore({ isLoading: true })

	useEffect(() => {
		const store = storeRef.current!

		// Get initial session from Supabase
		supabaseClient.auth
			.getSession()
			.then(({ data: { session } }: { data: { session: Session | null } }) => {
				store.getState().setSession(session)
				store.getState().setLoading(false)
			})

		// Listen for auth changes
		const {
			data: { subscription }
		} = supabaseClient.auth.onAuthStateChange(
			async (event: AuthChangeEvent, session: Session | null) => {
				store.getState().setSession(session)
				store.getState().setLoading(false)

				// Log auth events for debugging
				if (process.env.NODE_ENV === 'development') {
					logger.info('Auth state changed', {
						action: 'auth_state_change',
						metadata: { event, userId: session?.user?.id }
					})
				}
			}
		)

		return () => subscription.unsubscribe()
	}, [])

	return (
		<AuthStoreContext.Provider value={storeRef.current}>
			{children}
		</AuthStoreContext.Provider>
	)
}

export function useAuthStore<T>(selector: (state: AuthState) => T): T {
	const store = useContext(AuthStoreContext)

	if (!store) {
		throw new Error('Missing AuthStoreProvider')
	}

	// Always call hooks first (React Hooks rules)
	const [state, setState] = React.useState(() => selector(store.getState()))
	React.useEffect(() => {
		const unsubscribe = store.subscribe((state: AuthState) => {
			setState(selector(state))
		})
		return unsubscribe
	}, [store, selector])

	// Use the proper zustand hook if available
	if ('use' in store) {
		const storeUse = (
			store as unknown as {
				use: <U>(selector: (state: AuthState) => U) => U
			}
		).use
		return storeUse(selector)
	}

	// Return the state from hooks
	return state
}
