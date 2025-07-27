import React, { useEffect, useState, useMemo, useCallback, createContext } from 'react'
import type { User } from '@tenantflow/shared'
import { supabase } from '@/lib/clients'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'

// Auth context type definition
interface AuthContextType {
	accessToken: string | null
	token: string | null // Alias for WebSocket compatibility
	user: User | null
	isLoading: boolean
	error: string | null
	signUp: (email: string, password: string, name: string) => Promise<void>
	signIn: (email: string, password: string) => Promise<void>
	signInWithGoogle: () => Promise<void>
	signOut: () => Promise<void>
	updateProfile: (updates: Partial<User>) => Promise<void>
	refreshSession: () => Promise<void>
}

// Create the auth context
const AuthContext = createContext<AuthContextType | null>(null)

// Simplified Token Management using Supabase
const TokenManager = {
	getAccessToken: async () => {
		if (!supabase) return null
		const {
			data: { session }
		} = await supabase.auth.getSession()
		return session?.access_token || null
	},
	getRefreshToken: async () => {
		if (!supabase) return null
		const {
			data: { session }
		} = await supabase.auth.getSession()
		return session?.refresh_token || null
	},
	clearTokens: async () => {
		if (supabase) {
			await supabase.auth.signOut()
		}
		// Clean up any legacy tokens
		localStorage.removeItem('access_token')
		localStorage.removeItem('refresh_token')
		localStorage.removeItem('auth_token')
	}
}

/**
 * Auth Provider using NestJS backend API via Hono RPC
 * Manages JWT tokens and user profiles through backend API
 * No direct external service dependencies
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [accessToken, setAccessToken] = useState<string | null>(null)

	/**
	 * Fetch user profile from backend using Hono auth.me endpoint
	 */
	const fetchUserProfile = async (): Promise<User | null> => {
		try {
			if (!supabase) {
				throw new Error('Supabase client is not initialized.')
			}
			const token = await TokenManager.getAccessToken()
			if (!token) {
				throw new Error('No access token available')
			}

			const {
				data: { session }
			} = await supabase.auth.getSession()
			const supabaseId = session?.user?.id

			if (!supabaseId) {
				throw new Error('Could not get supabase user ID from session')
			}

			// Use direct API call until Hono client types are properly generated
			const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'
			const response = await fetch(`${backendUrl}/api/hono/api/v1/auth/me`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${session.access_token}`,
					'Content-Type': 'application/json'
				}
			})
			if (!response.ok) {
				throw new Error('Failed to fetch user profile')
			}
			const backendUser = await response.json()
			if (!backendUser) {
				throw new Error('Failed to fetch user profile from backend')
			}

			const userProfile: User = {
				...backendUser,
				name: backendUser.name || '',
				avatarUrl: backendUser.avatarUrl || null,
				phone: backendUser.phone || null,
				bio: null, // Not provided by backend
				stripeCustomerId: null, // Not provided by backend
				supabaseId: supabaseId,
				// Convert string dates to Date objects
				createdAt: new Date(backendUser.createdAt),
				updatedAt: new Date(backendUser.updatedAt)
			}
			return userProfile
		} catch (error) {
			logger.error('Failed to fetch user profile', error as Error)
			throw error
		}
	}

	/**
	 * Initialize auth state from Supabase session
	 */
	useEffect(() => {
		let mounted = true

		const initializeAuth = async () => {
			try {
				const token = await TokenManager.getAccessToken()

				if (mounted) {
					if (token) {
						setAccessToken(token)
						try {
							const userProfile = await fetchUserProfile()
							setUser(userProfile)
							setError(null)
						} catch {
							// Token might be expired, clear it
							await TokenManager.clearTokens()
							setAccessToken(null)
							setUser(null)
						}
					}
					setIsLoading(false)
				}
			} catch (e) {
				logger.error('Auth initialization failed', e as Error)
				if (mounted) {
					setError('Failed to initialize authentication')
					setIsLoading(false)
				}
			}
		}

		initializeAuth()

		// Listen for Supabase auth changes
		const {
			data: { subscription }
		} = supabase?.auth.onAuthStateChange(async (_event, session) => {
			if (mounted) {
				if (session) {
					setAccessToken(session.access_token)
					try {
						const userProfile = await fetchUserProfile()
						setUser(userProfile)
						setError(null)
					} catch {
						setUser(null)
						setError('Failed to fetch user profile')
					}
				} else {
					setAccessToken(null)
					setUser(null)
					setError(null)
				}
			}
		}) || { data: { subscription: null } }

		return () => {
			mounted = false
			subscription?.unsubscribe()
		}
	}, [])

	/**
	 * Sign up with email and password using Supabase
	 */
	const signUp = useCallback(
		async (email: string, password: string, name: string) => {
			setIsLoading(true)
			setError(null)

			try {
				if (!supabase) {
					throw new Error('Authentication service not available')
				}

				const { data, error: supabaseError } =
					await supabase.auth.signUp({
						email,
						password,
						options: {
							data: {
								name
							}
						}
					})

				if (supabaseError) {
					throw supabaseError
				}

				if (data.user) {
					// Registration successful - user will get confirmation email
					if (data.session) {
						// User is immediately logged in
						setAccessToken(data.session.access_token)
						try {
							const userProfile = await fetchUserProfile()
							setUser(userProfile)
							toast.success('Account created successfully!')
						} catch (profileError) {
							logger.error(
								'Failed to fetch user profile after registration',
								profileError as Error
							)
							toast.success(
								'Account created successfully! Please refresh to see your profile.'
							)
						}
					} else {
						// Email confirmation required
						toast.success(
							'Please check your email to confirm your account'
						)
					}
				}
			} catch (error) {
				const authError = error as Error
				logger.error('Sign up failed', authError)
				setError(authError.message || 'Sign up failed')
				toast.error(authError.message || 'Sign up failed')
			} finally {
				setIsLoading(false)
			}
		},
		[]
	)

	/**
	 * Sign in with email and password using Supabase
	 */
	const signIn = useCallback(async (email: string, password: string) => {
		setIsLoading(true)
		setError(null)

		try {
			if (!supabase) {
				throw new Error('Authentication service not available')
			}

			const { data, error: supabaseError } =
				await supabase.auth.signInWithPassword({
					email,
					password
				})

			if (supabaseError) {
				throw supabaseError
			}

			if (data.session) {
				setAccessToken(data.session.access_token)
				try {
					const userProfile = await fetchUserProfile()
					setUser(userProfile)
					toast.success('Welcome back!')
				} catch (profileError) {
					logger.error(
						'Failed to fetch user profile after login',
						profileError as Error
					)
					toast.success(
						'Welcome back! Please refresh to see your profile.'
					)
				}
			}
		} catch (error) {
			const authError = error as Error
			logger.error('Sign in failed', authError)
			setError(authError.message || 'Sign in failed')
			toast.error(authError.message || 'Sign in failed')
		} finally {
			setIsLoading(false)
		}
	}, [])

	/**
	 * Sign in with Google OAuth using Supabase
	 */
	const signInWithGoogle = useCallback(async () => {
		setIsLoading(true)
		setError(null)

		try {
			if (!supabase) {
				throw new Error('Authentication service not available')
			}

			const { error: supabaseError } =
				await supabase.auth.signInWithOAuth({
					provider: 'google',
					options: {
						redirectTo: `${window.location.origin}/auth/callback`
					}
				})

			if (supabaseError) {
				throw supabaseError
			}

			// OAuth redirect will handle the rest
		} catch (error) {
			const authError = error as Error
			logger.error('Google sign in failed', authError)
			setError(authError.message || 'Google sign in failed')
			toast.error(authError.message || 'Google sign in failed')
			setIsLoading(false)
		}
	}, [])

	/**
	 * Sign out using Supabase
	 */
	const signOut = useCallback(async () => {
		setIsLoading(true)

		try {
			// Clear tokens and state immediately
			await TokenManager.clearTokens()
			setAccessToken(null)
			setUser(null)
			setError(null)

			toast.success('Signed out successfully')
		} catch (error) {
			const authError = error as Error
			logger.error('Sign out failed', authError)
			setError(authError.message || 'Sign out failed')
			toast.error(authError.message || 'Sign out failed')
		} finally {
			setIsLoading(false)
		}
	}, [])

	/**
	 * Update user profile
	 */
	const updateProfile = useCallback(
		async (updates: Partial<User>) => {
			if (!user || !accessToken) return

			setIsLoading(true)

			try {
				const updatePayload = {
					...(updates.name !== undefined && updates.name !== null && { name: updates.name }),
					...(updates.phone !== undefined &&
						updates.phone !== null && { phone: updates.phone }),
					...(updates.avatarUrl !== undefined &&
						updates.avatarUrl !== null && {
							avatarUrl: updates.avatarUrl
						})
				}

				// Use direct API call until Hono client types are properly generated
				const { data: { session } } = await supabase.auth.getSession()
				if (!session?.access_token) {
					throw new Error('No active session')
				}
				
				const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'
				const updateResponse = await fetch(`${backendUrl}/api/hono/api/v1/auth/profile`, {
					method: 'PUT',
					headers: {
						'Authorization': `Bearer ${session.access_token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(updatePayload)
				})
				if (!updateResponse.ok) {
					throw new Error('Failed to update profile')
				}
				const updateResult = await updateResponse.json()
				if (!updateResult?.user) {
					throw new Error('Failed to update user profile')
				}
				const { user: updatedBackendUser } = updateResult

				setUser(currentUser => {
					if (!currentUser) return null // Should not happen if !user check passes
					const mergedUser: User = {
						...currentUser,
						...updatedBackendUser,
						// Ensure all required fields are present, even if null
						bio: currentUser.bio || null,
						supabaseId: currentUser.supabaseId, // Should always be present from initial fetch
						stripeCustomerId: currentUser.stripeCustomerId || null,
						// Convert string dates to Date objects
						createdAt: new Date(updatedBackendUser.createdAt),
						updatedAt: new Date(updatedBackendUser.updatedAt)
					}
					return mergedUser
				})

				toast.success('Profile updated')
			} catch (error) {
				const authError = error as Error
				logger.error('Profile update failed', authError)
				setError(authError.message || 'Profile update failed')
				toast.error(authError.message || 'Profile update failed')
			} finally {
				setIsLoading(false)
			}
		},
		[user, accessToken]
	)

	/**
	 * Refresh session/tokens using Supabase
	 */
	const refreshSession = useCallback(async () => {
		try {
			if (!supabase) {
				logger.warn('Supabase not available for session refresh')
				return
			}

			const { data, error: supabaseError } =
				await supabase.auth.refreshSession()
			if (supabaseError) {
				throw supabaseError
			}

			if (data.session) {
				setAccessToken(data.session.access_token)

				// Optionally refresh user profile
				try {
					const userProfile = await fetchUserProfile()
					setUser(userProfile)
				} catch (e) {
					logger.warn(
						'Failed to refresh user profile during session refresh',
						e as Error
					)
				}
			}
		} catch (error) {
			logger.error('Session refresh failed', error as Error)
			// If refresh fails, clear tokens and redirect to login
			await TokenManager.clearTokens()
			setAccessToken(null)
			setUser(null)
		}
	}, [])

	const value: AuthContextType = useMemo(
		() => ({
			accessToken,
			token: accessToken, // Alias for WebSocket compatibility
			user,
			isLoading,
			error,
			signUp,
			signIn,
			signInWithGoogle,
			signOut,
			updateProfile,
			refreshSession
		}),
		[
			accessToken,
			user,
			isLoading,
			error,
			signUp,
			signIn,
			signInWithGoogle,
			signOut,
			updateProfile,
			refreshSession
		]
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Export context for external use
export { AuthContext }
