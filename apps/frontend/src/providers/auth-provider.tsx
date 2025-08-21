'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { onAuthStateChange, type AuthUser } from '@/lib/supabase/client'
import { AuthApi } from '@/lib/auth-api'
import { sessionManager } from '@/lib/auth/session-manager'
import { toast } from 'sonner'

interface AuthState {
	user: AuthUser | null
	loading: boolean
	initialized: boolean
}

interface AuthContextType extends AuthState {
	signIn: (
		email: string,
		password: string
	) => Promise<{ success: boolean; error?: string }>
	signOut: () => Promise<void>
	refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
	children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [state, setState] = useState<AuthState>({
		user: null,
		loading: true,
		initialized: false
	})

	const router = useRouter()
	const initializingRef = useRef(false)

	// Initialize auth state
	useEffect(() => {
		if (initializingRef.current) return

		initializingRef.current = true
		let mounted = true

		const initializeAuth = async () => {
			try {
				logger.debug('Initializing auth state', {
					component: 'AuthProvider'
				})

				// Use session manager for initialization
				const user = await sessionManager.initialize()

				if (mounted) {
					setState({
						user,
						loading: false,
						initialized: true
					})
				}

				logger.debug('Auth state initialized', {
					component: 'AuthProvider',
					hasUser: !!user
				})
			} catch (error) {
				logger.error(
					'Auth initialization failed:',
					error instanceof Error ? error : new Error(String(error)),
					{
						component: 'AuthProvider'
					}
				)

				if (mounted) {
					setState({
						user: null,
						loading: false,
						initialized: true
					})
				}
			}
		}

		initializeAuth()

		// Listen for auth state changes
		const {
			data: { subscription }
		} = onAuthStateChange(async (event, session) => {
			if (!mounted) return

			logger.debug('Auth state change event', {
				component: 'AuthProvider',
				event,
				hasSession: !!session
			})

			try {
				if (event === 'SIGNED_OUT' || !session) {
					setState(prev => ({
						...prev,
						user: null
					}))

					// Cleanup session manager
					sessionManager.cleanup()

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
					try {
						// Sync with backend
						const authSession = await AuthApi.getCurrentSession()

						setState(prev => ({
							...prev,
							user: authSession?.user || null
						}))

						// Session manager handles token refresh automatically

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
					} catch (backendError) {
						logger.warn(
							'Backend sync failed during auth state change:',
							{
								component: 'AuthProvider',
								error: backendError
							}
						)

						// Fallback to Supabase user data
						if (session.user) {
							setState(prev => ({
								...prev,
								user: {
									id: session.user.id,
									email: session.user.email || '',
									name:
										session.user.user_metadata?.full_name ||
										session.user.email || 'Unknown User',
									avatar_url:
										session.user.user_metadata?.avatar_url
								}
							}))

							// Session manager handles token refresh automatically
						}
					}
				}
			} catch (error) {
				logger.error(
					'Auth state change error:',
					error instanceof Error ? error : new Error(String(error)),
					{
						component: 'AuthProvider'
					}
				)
			}
		})

		return () => {
			mounted = false
			initializingRef.current = false
			subscription.unsubscribe()
			sessionManager.cleanup()
		}
	}, [router])

	// Session management is now handled by SessionManager

	const signIn = async (email: string, password: string) => {
		try {
			setState(prev => ({ ...prev, loading: true }))

			const session = await AuthApi.login({ email, password })

			setState(prev => ({
				...prev,
				user: session.user,
				loading: false
			}))

			toast.success('Welcome back!')

			return { success: true }
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Login failed'
			setState(prev => ({ ...prev, loading: false }))
			toast.error(message)

			return { success: false, error: message }
		}
	}

	const signOut = async () => {
		try {
			setState(prev => ({ ...prev, loading: true }))

			await AuthApi.logout()

			setState(prev => ({
				...prev,
				user: null,
				loading: false
			}))

			sessionManager.cleanup()

			toast.success('Logged out successfully')
			router.push('/')
		} catch (error) {
			logger.error(
				'Logout error:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'AuthProvider'
				}
			)

			// Clear local state even if logout fails
			setState(prev => ({
				...prev,
				user: null,
				loading: false
			}))

			router.push('/')
		}
	}

	const refreshSession = async () => {
		try {
			const user = await sessionManager.refreshSession()
			setState(prev => ({
				...prev,
				user
			}))
		} catch (error) {
			logger.error(
				'Session refresh failed:',
				error instanceof Error ? error : new Error(String(error)),
				{
					component: 'AuthProvider'
				}
			)

			// If refresh fails, clear user state
			setState(prev => ({
				...prev,
				user: null
			}))
		}
	}

	const value: AuthContextType = {
		...state,
		signIn,
		signOut,
		refreshSession
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
	const context = useContext(AuthContext)

	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider')
	}

	return context
}

// Hook for checking if user is authenticated
export function useRequireAuth() {
	const { user, loading, initialized } = useAuth()
	const router = useRouter()

	useEffect(() => {
		if (initialized && !loading && !user) {
			router.push('/auth/login')
		}
	}, [user, loading, initialized, router])

	return { user, loading: loading || !initialized, isAuthenticated: !!user }
}
