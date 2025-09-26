import type { AuthState, authUser } from '@repo/shared'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'

export type { AuthState, authUser }

export const createAuthStore = (init?: Partial<AuthState>) =>
	createStore<AuthState>()(
		subscribeWithSelector((set) => ({
			user: init?.user ?? null,
			session: init?.session ?? null,
			isAuthenticated: init?.user ? true : false,
			isLoading: init?.isLoading ?? true,
			setUser: user =>
				set({
					user,
					isAuthenticated: !!user
				}),
			setSession: session =>
				set({
					session,
					user: (session?.user as authUser | null) ?? null,
					isAuthenticated: !!session?.user
				}),
			setLoading: loading => set({ isLoading: loading }),
			signOut: () =>
				set({
					user: null,
					session: null,
					isAuthenticated: false,
					isLoading: false
				})
		}))
	)
