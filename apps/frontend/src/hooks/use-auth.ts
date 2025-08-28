/**
 * Authentication Hook - Single Source of Truth
 * Direct Supabase Auth integration with Zustand store sync
 * Follows CLAUDE.md rules: No abstractions, direct library usage
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '../stores/app-store'
import { logger } from '@/lib/logger/logger'
import { notifications } from '@/lib/toast'
import type { AuthUser } from '@repo/shared'
import type {
	User as SupabaseUser,
	AuthChangeEvent,
	Session
} from '@supabase/supabase-js'

// Map Supabase user to app AuthUser type
function mapSupabaseUserToAppUser(supabaseUser: SupabaseUser): AuthUser {
	return {
		id: supabaseUser.id,
		supabaseId: supabaseUser.id,
		email: supabaseUser.email || '',
		name:
			supabaseUser.user_metadata?.name ||
			supabaseUser.user_metadata?.full_name ||
			null,
		phone: null,
		bio: null,
		avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
		role: 'TENANT', // Default role - backend will update with correct role
		organizationId: null,
		createdAt: new Date(
			supabaseUser.created_at || new Date().toISOString()
		),
		updatedAt: new Date(
			supabaseUser.updated_at || new Date().toISOString()
		),
		stripeCustomerId: null,
		emailVerified: !!supabaseUser.email_confirmed_at
	}
}

export function useAuth() {
	// Get state from Zustand store
	const session = useAppStore(state => state.session)
	const setStoreUser = useAppStore(state => state.setUser)
	const clearSession = useAppStore(state => state.clearSession)

	// Local loading state for auth operations
	const [loading, setLoading] = useState(true)
	const [initialized, setInitialized] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const router = useRouter()

	// Initialize auth state on mount
	useEffect(() => {
		let mounted = true

		const initializeAuth = async () => {
			try {
				logger.debug('Initializing auth state', {
					component: 'useAuth'
				})

				// Get initial session from Supabase
				const {
					data: { session }
				} = await supabase.auth.getSession()

				if (mounted) {
					const appUser = session?.user
						? mapSupabaseUserToAppUser(session.user)
						: null
					setStoreUser(appUser)
					setLoading(false)
					setInitialized(true)
				}

				logger.debug('Auth state initialized', {
					component: 'useAuth',
					hasUser: !!session?.user
				})
			} catch (err) {
				logger.error(
					'Auth initialization failed:',
					err instanceof Error ? err : new Error(String(err))
				)

				if (mounted) {
					setError(
						err instanceof Error
							? err.message
							: 'Auth initialization failed'
					)
					setStoreUser(null)
					setLoading(false)
					setInitialized(true)
				}
			}
		}

		void initializeAuth()

		// Listen for auth state changes - Direct Supabase usage
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange(
			async (event: AuthChangeEvent, session: Session | null) => {
				if (!mounted) {
					return
				}

				logger.debug('Auth state change event', {
					component: 'useAuth',
					event,
					hasSession: !!session
				})

				try {
					if (event === 'SIGNED_OUT' || !session) {
						setStoreUser(null)
						clearSession()
						setError(null)

						// Redirect to login for protected routes
						const currentPath = window.location.pathname
						const isProtectedRoute = [
							'/dashboard',
							'/properties',
							'/tenants',
							'/leases',
							'/maintenance',
							'/profile'
						].some(route => currentPath.startsWith(route))

						if (isProtectedRoute) {
							router.push('/auth/login')
						}
					} else if (
						event === 'SIGNED_IN' ||
						event === 'TOKEN_REFRESHED'
					) {
						const appUser = session.user
							? mapSupabaseUserToAppUser(session.user)
							: null
						setStoreUser(appUser)
						setError(null)

						// Redirect from auth pages to dashboard
						const currentPath = window.location.pathname
						const isAuthPage = [
							'/auth/login',
							'/auth/signup',
							'/login',
							'/signup'
						].some(route => currentPath === route)

						if (isAuthPage) {
							router.push('/dashboard')
						}
					}
				} catch (err) {
					logger.error(
						'Auth state change error:',
						err instanceof Error ? err : new Error(String(err))
					)
					setError(
						err instanceof Error
							? err.message
							: 'Auth state change failed'
					)
				}
			}
		)

		return () => {
			mounted = false
			subscription.unsubscribe()
		}
	}, [router, setStoreUser, clearSession])

	// Sign in method - Direct Supabase usage
	const signIn = useCallback(async (email: string, password: string) => {
		try {
			setLoading(true)
			setError(null)

			const { data: _data, error: authError } =
				await supabase.auth.signInWithPassword({
					email,
					password
				})

			if (authError) {
				setError(authError.message)
				notifications.error('Login failed', {
					description: authError.message
				})
				return { success: false, error: authError.message }
			}

			notifications.success('Welcome back!')
			return { success: true }
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Login failed'
			setError(message)
			notifications.error('Login failed', { description: message })
			return { success: false, error: message }
		} finally {
			setLoading(false)
		}
	}, [])

	// Sign up method - Direct Supabase usage
	const signUp = useCallback(
		async (email: string, password: string, name: string) => {
			try {
				setLoading(true)
				setError(null)

				const { data: _data, error: authError } =
					await supabase.auth.signUp({
						email,
						password,
						options: {
							data: {
								name,
								full_name: name
							}
						}
					})

				if (authError) {
					setError(authError.message)
					notifications.error('Signup failed', {
						description: authError.message
					})
					return { success: false, error: authError.message }
				}

				notifications.success('Account created!', {
					description: 'Check your email to verify your account.'
				})
				return { success: true }
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Signup failed'
				setError(message)
				notifications.error('Signup failed', { description: message })
				return { success: false, error: message }
			} finally {
				setLoading(false)
			}
		},
		[]
	)

	// Sign out method - Direct Supabase usage
	const signOut = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)

			const { error: authError } = await supabase.auth.signOut()

			if (authError) {
				logger.error('Logout error:', authError)
				setError(authError.message)
			} else {
				notifications.success('Logged out successfully')
			}

			router.push('/')
		} catch (err) {
			logger.error(
				'Logout error:',
				err instanceof Error ? err : new Error(String(err))
			)

			// Clear local state even if logout fails
			clearSession()
			router.push('/')
		} finally {
			setLoading(false)
		}
	}, [router, clearSession])

	// Password reset method - Direct Supabase usage
	const resetPassword = useCallback(async (email: string) => {
		try {
			setError(null)

			const { error: authError } =
				await supabase.auth.resetPasswordForEmail(email, {
					redirectTo: `${window.location.origin}/auth/reset-password`
				})

			if (authError) {
				setError(authError.message)
				notifications.error('Password reset failed', {
					description: authError.message
				})
				return { success: false, error: authError.message }
			}

			notifications.success('Password reset email sent!', {
				description: 'Please check your inbox.'
			})
			return { success: true }
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Password reset failed'
			setError(message)
			notifications.error('Password reset failed', {
				description: message
			})
			return { success: false, error: message }
		}
	}, [])

	return {
		// State
		user: session.user,
		isAuthenticated: session.isAuthenticated,
		loading,
		initialized,
		error,

		// Methods
		signIn,
		signUp,
		signOut,
		resetPassword,

		// Backward compatibility aliases
		setUser: setStoreUser,
		clearAuth: clearSession,
		logout: signOut,
		session
	}
}

// Hook for checking if user is authenticated and redirecting if needed
export function useRequireAuth() {
	const auth = useAuth()
	const router = useRouter() // Already imported above

	useEffect(() => {
		if (auth.initialized && !auth.loading && !auth.user) {
			router.push('/auth/login')
		}
	}, [auth.user, auth.loading, auth.initialized, router])

	return {
		user: auth.user,
		loading: auth.loading || !auth.initialized,
		isAuthenticated: !!auth.user,
		error: auth.error
	}
}
