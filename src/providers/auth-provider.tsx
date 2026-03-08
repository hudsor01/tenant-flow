'use client'

import * as Sentry from '@sentry/nextjs'
import { createClient } from '#lib/supabase/client'
import { authKeys } from '#hooks/api/use-auth'
import { setQueryClientRef } from '#lib/supabase/get-cached-user'
import { createLogger } from '#lib/frontend-logger.js'
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

	// Register QueryClient ref for getCachedUser() in non-React contexts
	useEffect(() => {
		setQueryClientRef(queryClient)
	}, [queryClient])

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
					queryClient.setQueryData(authKeys.session(), null)
					queryClient.setQueryData(authKeys.user(), null)
					queryClient.removeQueries({ queryKey: authKeys.all })
				} else if (session) {
					queryClient.setQueryData(authKeys.session(), session)
					queryClient.setQueryData(authKeys.user(), session.user)
				}
			}
		)

		return () => {
			subscription.unsubscribe()
			listenerSetupRef.current = false
		}
	}, [queryClient])

	// Server-validated user fetch (AUTH-03: getUser() instead of getSession())
	const { data: user, isLoading: isUserLoading } = useQuery({
		queryKey: authKeys.user(),
		queryFn: async () => {
			const {
				data: { user },
				error
			} = await getSupabaseClient().auth.getUser()
			if (error) {
				logger.error('Failed to get auth user', { error: error.message })
				return null
			}
			return user
		},
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1
	})

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

	const isLoading = isUserLoading

	const authState: AuthContextType = useMemo(
		() => ({
			session: undefined,
			isAuthenticated: !!user,
			isLoading,
			user
		}),
		[user, isLoading]
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
