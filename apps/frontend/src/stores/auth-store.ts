/**
 * Auth Store - Session Management
 *
 * Follows Zustand best practices:
 * - No redundant computed state (isAuthenticated derived from user)
 * - Uses vanilla createStore for server-side compatibility
 * - Separate state and actions
 */

import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { AuthState } from '@repo/shared/types/auth'

type AuthStoreState = Omit<AuthState, 'isAuthenticated'> & {
	setUser: (user: AuthState['user']) => void
	setSession: (session: AuthState['session']) => void
	setLoading: (loading: boolean) => void
	signOut: () => void
}

const initialState = {
	user: null,
	session: null,
	isLoading: true
}

export const createAuthStore = (
	init?: Partial<Omit<AuthState, 'isAuthenticated'>>
) =>
	createStore<AuthStoreState>()(
		subscribeWithSelector(set => ({
			user: init?.user ?? initialState.user,
			session: init?.session ?? initialState.session,
			isLoading: init?.isLoading ?? initialState.isLoading,

			setUser: user => set({ user }),

			setSession: session =>
				set({
					session,
					user: session?.user ?? null
				}),

			setLoading: loading => set({ isLoading: loading }),

			signOut: () =>
				set({
					user: null,
					session: null,
					isLoading: false
				})
		}))
	)
