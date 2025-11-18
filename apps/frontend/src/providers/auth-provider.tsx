'use client'

import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'

const supabaseClient = getSupabaseClientInstance()
const logger = createLogger({ component: 'AuthProvider' })

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

		// Debug logging for auth provider initialization
		logger.info('Setting up auth listener', { action: 'setup' })

		const {
			data: { subscription }
		} = supabaseClient.auth.onAuthStateChange(
			(event: AuthChangeEvent, session: Session | null) => {
				// Debug logging for auth events
				const logContext: Record<string, unknown> = {
					action: 'authStateChange',
					metadata: { event, hasSession: !!session }
				}
				if (session?.user?.id) {
					logContext.user_id = session.user.id
				}
				logger.info('State change event', logContext)

				// Official Supabase pattern: handle auth state changes
				if (event === 'SIGNED_OUT') {
					queryClient.setQueryData(authQueryKeys.session, null)
					queryClient.setQueryData(authQueryKeys.user, null)
					// Only clear auth-related data, not all data
					queryClient.removeQueries({ queryKey: ['auth'] })
				} else if (session) {
					queryClient.setQueryData(authQueryKeys.session, session)
					queryClient.setQueryData(authQueryKeys.user, session.user)
				}

				// Log auth events for debugging
				if (process.env.NODE_ENV === 'development') {
					logger.info('Auth state changed', {
						action: 'auth_state_change',
						metadata: { event, user_id: session?.user?.id }
					})
				}
			}
		)

		return () => {
			// Debug logging for cleanup
			logger.info('Cleaning up auth listener', { action: 'cleanup' })
			subscription.unsubscribe()
			listenerSetupRef.current = false
		}
	}, [queryClient])

	// SECURITY: Validate user with getUser() instead of using session.user from getSession()
	// getUser() authenticates with Supabase Auth server, preventing cookie tampering
	const { data: user, isLoading: isUserLoading } = useQuery({
		queryKey: authQueryKeys.user,
		queryFn: async () => {
			logger.info('Fetching user', { action: 'fetchUser' })
			const {
				data: { user },
				error
			} = await supabaseClient.auth.getUser()
			if (error) {
				const errorStatus =
					typeof error === 'object' &&
					error !== null &&
					'status' in error &&
					typeof (error as { status?: number }).status === 'number'
						? (error as { status?: number }).status
						: undefined
				const errorMessage =
					typeof error === 'object' && error !== null && 'message' in error
						? String((error as { message?: string }).message ?? '')
						: ''

				const isUnauthenticated =
					errorStatus === 401 || /auth session/i.test(errorMessage)

				if (isUnauthenticated) {
					logger.debug('No active auth session', {
						action: 'get_user_missing_session',
						metadata: { message: errorMessage }
					})
				} else {
					logger.error('Failed to get auth user', {
						action: 'get_user_error',
						metadata: { error: errorMessage }
					})
				}
				// Don't throw - user might not be authenticated or the session expired
				return null
			}
			return user
		},
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 1
	})

	// Get session for access token (only after user validation)
const { data: session, isLoading: isSessionLoading } = useQuery({
	queryKey: authQueryKeys.session,
	queryFn: async () => {
			logger.info('Fetching session', { action: 'fetchSession' })
			const {
				data: { session },
				error
			} = await supabaseClient.auth.getSession()
			if (error) {
				logger.error('Failed to get auth session', {
					action: 'get_session_error',
					metadata: { error: error.message }
				})
				// Don't throw - might not be authenticated
				return null
			}
			return session
	},
	staleTime: 5 * 60 * 1000,
	refetchOnWindowFocus: false,
	retry: 1,
	enabled: !!user // Only fetch session if user is validated
})

	useEffect(() => {
		if (user === null) {
			queryClient.setQueryData(authQueryKeys.session, null)
		}
	}, [user, queryClient])

const isLoading = isUserLoading || isSessionLoading

	const authState: AuthContextType = useMemo(
		() => ({
			session,
			isAuthenticated: !!user, // Use validated user, not session.user
			isLoading,
			user: user || null // Use validated user from getUser()
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
