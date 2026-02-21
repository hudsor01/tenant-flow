'use client'

import * as Sentry from '@sentry/nextjs'
import { createClient } from '#lib/supabase/client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'

const logger = createLogger({ component: 'AuthProvider' })

// Lazy singleton - only created when first accessed at runtime (not during SSG)
let supabaseClient: SupabaseClient | null = null
function getSupabaseClient(): SupabaseClient {
	if (!supabaseClient) {
		supabaseClient = createClient()
	}
	return supabaseClient
}

export const authQueryKeys = {
	session: ['auth', 'session'] as const,
	user: ['auth', 'user'] as const
}

// Auth context for derived state access
interface AuthContextType {
	isAuthenticated: boolean
	isLoading: boolean
	session: Session | null | undefined
	user: Session['user'] | null | undefined
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthStoreProvider = ({ children }: { children: ReactNode }) => {
	const queryClient = useQueryClient()
	// Prevent duplicate listeners in React Strict Mode
	const listenerSetupRef = useRef(false)

	// Official Supabase onAuthStateChange pattern with React Query integration
	useEffect(() => {
		// Prevent setting up multiple listeners in React Strict Mode
		if (listenerSetupRef.current) {
			return
		}
		listenerSetupRef.current = true

		const {
			data: { subscription }
		} = getSupabaseClient().auth.onAuthStateChange(
			(event: AuthChangeEvent, session: Session | null) => {
				// Official Supabase pattern: handle auth state changes
				if (event === 'SIGNED_OUT') {
					queryClient.setQueryData(authQueryKeys.session, null)
					queryClient.setQueryData(authQueryKeys.user, null)
					queryClient.removeQueries({ queryKey: ['auth'] })
				} else if (session) {
					queryClient.setQueryData(authQueryKeys.session, session)
					queryClient.setQueryData(authQueryKeys.user, session.user)
				}
			}
		)

		return () => {
			subscription.unsubscribe()
			listenerSetupRef.current = false
		}
	}, [queryClient])

	// Single round-trip: fetch session once and derive user from it
	const { data: session, isLoading: isSessionLoading } = useQuery({
		queryKey: authQueryKeys.session,
		queryFn: async () => {
			const {
				data: { session },
				error
			} = await getSupabaseClient().auth.getSession()
			if (error) {
				logger.error('Failed to get auth session', { error: error.message })
				return null
			}
			return session
		},
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1
	})

	// Keep derived user in sync with session without issuing another network call
	const user = session?.user ?? null
	useEffect(() => {
		queryClient.setQueryData(authQueryKeys.user, user)
	}, [queryClient, user])

	// Set Sentry user context for error tracking
	useEffect(() => {
		if (user) {
			Sentry.setUser({
				id: user.id,
				...(user.email && { email: user.email })
			})
			// Set role tag for filtering errors by user type (owner vs tenant)
			const role = user.app_metadata?.role as string | undefined
			if (role) {
				Sentry.setTag('user.role', role)
			}
		} else {
			Sentry.setUser(null)
			Sentry.setTag('user.role', undefined)
		}
	}, [user])

	const isLoading = isSessionLoading

	const authState: AuthContextType = useMemo(
		() => ({
			session,
			isAuthenticated: !!user,
			isLoading,
			user
		}),
		[session, user, isLoading]
	)

	return (
		<AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)

	if (!context) {
		throw new Error('useAuth must be used within AuthStoreProvider')
	}

	return context
}
