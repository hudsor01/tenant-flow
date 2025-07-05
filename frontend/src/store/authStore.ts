import { create } from 'zustand'
import { toast } from 'sonner'
import type { User, UserRole } from '@/types/auth'
import type { AuthStore, SessionCheckState } from '@/types/store'
import { apiClient, ApiClientError } from '@/lib/api-client'
import { logger, AuthError, withErrorHandling } from '@/lib/logger'
import posthog from 'posthog-js'
import * as FacebookPixel from '@/lib/facebook-pixel'

const sessionCheckState: SessionCheckState = {
	lastFailTime: 0,
	failureCount: 0,
	isCircuitOpen: false
}

const MAX_FAILURES = 3
const CIRCUIT_BREAKER_TIMEOUT = 30000 // 30 seconds

export const useAuthStore = create<AuthStore>((set, get) => ({
	user: null,
	isLoading: false,
	error: null,

	// 🚀 Computed properties - Replaces useCurrentUserName + useCurrentUserImage
	get currentUserName() {
		const { user } = get()
		return user?.name || user?.email?.split('@')[0] || 'User'
	},

	get currentUserImage() {
		const { user } = get()
		return user?.avatarUrl || null
	},

	get userInitials() {
		const { user } = get()
		if (!user?.name) return '??'
		return user.name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	},

	setUser: (user: User | null) =>
		set({
			user,
			error: null
		}),

	setLoading: (isLoading: boolean) => set({ isLoading }),

	setError: (error: string | null) => set({ error }),

	signUp: async (email: string, password: string, name: string) => {
		const result = await withErrorHandling(
			async () => {
				set({ isLoading: true, error: null })

				logger.authEvent('sign_up_attempt', undefined, {
					email: email.split('@')[0]
				})
				toast.info('Creating account...')

				try {
					const response = await apiClient.auth.register({
						email,
						password,
						name,
						confirmPassword: password
					})

					logger.authEvent('sign_up_success', response.user.id, {
						email: email.split('@')[0]
					})

					// Track signup event in PostHog
					posthog?.capture('user_signed_up', {
						method: 'email',
						email: email,
						user_id: response.user.id,
						timestamp: new Date().toISOString()
					})

					// Track signup event in Facebook Pixel
					FacebookPixel.trackCompleteRegistration('email')

					// Send to n8n automation workflow
					try {
						await fetch(
							'http://192.168.0.221:5678/webhook-test/tenantflow-signup',
							{
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({
									email: email,
									name: name,
									userId: response.user.id,
									timestamp: new Date().toISOString(),
									method: 'email'
								})
							}
						)
					} catch (error) {
						// Don't block signup if n8n webhook fails
						logger.warn('n8n webhook failed during signup', {
							error
						})
					}

					toast.success('Account created successfully!')

					// Get the full user profile
					const userProfile = await apiClient.users.me()

					set({
						user: {
							id: userProfile.id,
							email: userProfile.email,
							name: userProfile.name || null,
							phone: userProfile.phone || null,
							bio: userProfile.bio || null,
							avatarUrl: userProfile.avatarUrl || null,
							role: userProfile.role as UserRole,
							createdAt: userProfile.createdAt,
							updatedAt: userProfile.updatedAt
						},
						isLoading: false,
						error: null
					})

					return response.user
				} catch (error) {
					const errorMessage =
						error instanceof ApiClientError
							? error.message
							: 'Sign up failed'

					const authError = new AuthError(
						`Sign up failed: ${errorMessage}`,
						'SIGNUP_ERROR',
						error as Error
					)
					logger.authEvent('sign_up_failed', undefined, {
						email: email.split('@')[0],
						error: errorMessage
					})
					toast.error(authError.message)
					throw authError
				}
			},
			{ operation: 'email_sign_up', component: 'authStore' }
		)

		if (!result) {
			const errorMessage = 'Sign up failed'
			set({
				error: errorMessage,
				isLoading: false
			})
			throw new AuthError(errorMessage)
		}
	},

	signIn: async (email: string, password: string) => {
		const result = await withErrorHandling(
			async () => {
				set({ isLoading: true, error: null })

				logger.authEvent('sign_in_attempt', undefined, {
					email: email.split('@')[0]
				})
				toast.info('Signing in...')

				try {
					const response = await apiClient.auth.login({
						email,
						password
					})

					logger.authEvent('sign_in_success', response.user.id, {
						email: email.split('@')[0]
					})
					toast.info('Loading profile...')

					// Get the full user profile
					const userProfile = await apiClient.users.me()

					logger.authEvent('profile_loaded', response.user.id)

					// Track login event and identify user in PostHog
					posthog?.capture('user_logged_in', {
						method: 'email',
						email: email,
						user_id: userProfile.id,
						timestamp: new Date().toISOString()
					})

					posthog?.identify(userProfile.id, {
						email: userProfile.email,
						name: userProfile.name,
						created_at: userProfile.createdAt
					})

					// Track login event in Facebook Pixel
					FacebookPixel.trackCustomEvent('UserLogin', {
						method: 'email',
						user_id: userProfile.id
					})

					toast.success('Successfully signed in!')

					const user = {
						id: userProfile.id,
						email: userProfile.email,
						name: userProfile.name || null,
						phone: userProfile.phone || null,
						bio: userProfile.bio || null,
						avatarUrl: userProfile.avatarUrl || null,
						role: userProfile.role as UserRole,
						createdAt: userProfile.createdAt,
						updatedAt: userProfile.updatedAt
					}

					set({
						user,
						isLoading: false
					})

					return user
				} catch (error) {
					const errorMessage =
						error instanceof ApiClientError
							? error.message
							: 'Sign in failed'

					const authError = new AuthError(
						`Sign in failed: ${errorMessage}`,
						'SIGNIN_ERROR',
						error as Error
					)
					logger.authEvent('sign_in_failed', undefined, {
						email: email.split('@')[0],
						error: errorMessage
					})
					toast.error(authError.message)
					throw authError
				}
			},
			{ operation: 'email_sign_in', component: 'authStore' }
		)

		if (!result) {
			const errorMessage = 'Sign in failed'
			set({
				error: errorMessage,
				isLoading: false
			})
			throw new AuthError(errorMessage)
		}
	},

	signOut: async () => {
		const result = await withErrorHandling(
			async () => {
				set({ isLoading: true })

				const currentUser = get().user
				logger.authEvent('sign_out_attempt', currentUser?.id)
				toast.info('Signing out...')

				try {
					// Clear tokens from localStorage
					apiClient.auth.logout()

					logger.authEvent('sign_out_success', currentUser?.id)
					toast.success('Successfully signed out!')

					set({
						user: null,
						isLoading: false,
						error: null
					})

					return true
				} catch (error) {
					const errorMessage =
						error instanceof ApiClientError
							? error.message
							: 'Sign out failed'

					const authError = new AuthError(
						`Sign out failed: ${errorMessage}`,
						'SIGNOUT_ERROR',
						error instanceof Error ? error : undefined
					)
					logger.authEvent('sign_out_failed', currentUser?.id, {
						error: errorMessage
					})
					toast.error(authError.message)
					throw authError
				}
			},
			{ operation: 'sign_out', component: 'authStore' }
		)

		if (!result) {
			const errorMessage = 'Sign out failed'
			set({
				error: errorMessage,
				isLoading: false
			})
		}
	},

	checkSession: async () => {
		// Prevent multiple concurrent session checks
		const currentState = get()
		if (currentState.isLoading) {
			logger.debug('Session check already in progress, skipping')
			return
		}

		// Circuit breaker: Check if we should skip due to repeated failures
		const now = Date.now()
		if (sessionCheckState.isCircuitOpen) {
			if (
				now - sessionCheckState.lastFailTime <
				CIRCUIT_BREAKER_TIMEOUT
			) {
				logger.warn('Circuit breaker is open, skipping session check', {
					failureCount: sessionCheckState.failureCount,
					lastFailTime: sessionCheckState.lastFailTime,
					timeUntilReset:
						CIRCUIT_BREAKER_TIMEOUT -
						(now - sessionCheckState.lastFailTime)
				})
				set({
					isLoading: false,
					error: 'Profile lookup temporarily disabled due to repeated failures'
				})
				return
			} else {
				// Reset circuit breaker
				logger.info('Circuit breaker timeout expired, resetting')
				sessionCheckState.isCircuitOpen = false
				sessionCheckState.failureCount = 0
			}
		}

		try {
			logger.authEvent('session_check_start')

			// Check if we have a token
			const hasToken = apiClient.auth.isAuthenticated()

			logger.authEvent('session_retrieved', undefined, {
				hasToken
			})

			if (hasToken) {
				try {
					logger.authEvent('profile_lookup_start')

					// Get the current user profile
					const userProfile = await apiClient.users.me()

					logger.info('Profile loaded successfully', {
						userId: userProfile.id
					})

					// Identify user in PostHog on session check
					posthog?.identify(userProfile.id, {
						email: userProfile.email,
						name: userProfile.name,
						created_at: userProfile.createdAt
					})

					// Reset circuit breaker on success
					sessionCheckState.failureCount = 0
					sessionCheckState.isCircuitOpen = false

					const user = {
						id: userProfile.id,
						email: userProfile.email,
						name: userProfile.name || null,
						phone: userProfile.phone || null,
						bio: userProfile.bio || null,
						avatarUrl: userProfile.avatarUrl || null,
						role: userProfile.role as UserRole,
						createdAt: userProfile.createdAt,
						updatedAt: userProfile.updatedAt
					}

					logger.authEvent('session_check_success', userProfile.id)
					set({
						user,
						isLoading: false,
						error: null
					})
					return
				} catch (error) {
					// Handle profile fetch error with circuit breaker
					sessionCheckState.failureCount++
					sessionCheckState.lastFailTime = now

					if (sessionCheckState.failureCount >= MAX_FAILURES) {
						sessionCheckState.isCircuitOpen = true
						logger.error(
							'Circuit breaker activated due to repeated profile lookup failures',
							new Error(
								`Circuit breaker activated. Failure count: ${sessionCheckState.failureCount}, Max failures: ${MAX_FAILURES}`
							)
						)
					} else {
						const errorMessage =
							error instanceof ApiClientError
								? error.message
								: 'Unknown error'

						logger.authEvent('profile_not_found', undefined, {
							error: errorMessage,
							failureCount: sessionCheckState.failureCount
						})
					}

					// If unauthorized, clear tokens
					if (
						error instanceof ApiClientError &&
						error.isUnauthorized
					) {
						apiClient.auth.logout()
					}

					// Don't throw error to prevent infinite loops - just set error state
					set({
						user: null,
						isLoading: false,
						error: sessionCheckState.isCircuitOpen
							? 'Profile lookup temporarily disabled'
							: 'Profile not found'
					})
					return
				}
			} else {
				logger.authEvent('no_session')
				set({ user: null, isLoading: false, error: null })
			}
		} catch (error) {
			logger.error('Session check failed', error as Error)
			set({
				user: null,
				isLoading: false,
				error: 'Session check failed'
			})
		}
	},

	updateProfile: async (updates: Partial<User>) => {
		const result = await withErrorHandling(
			async () => {
				const currentUser = get().user
				if (!currentUser) {
					throw new AuthError('No user logged in')
				}

				logger.authEvent('profile_update_attempt', currentUser.id)

				try {
					// Update user profile via API
					const updatedProfile = await apiClient.users.updateProfile({
						name: updates.name || undefined,
						phone: updates.phone || undefined,
						bio: updates.bio || undefined,
						avatarUrl: updates.avatarUrl || undefined
					})

					logger.authEvent('profile_update_success', currentUser.id)

					const user = {
						id: updatedProfile.id,
						email: updatedProfile.email,
						name: updatedProfile.name || null,
						phone: updatedProfile.phone || null,
						bio: updatedProfile.bio || null,
						avatarUrl: updatedProfile.avatarUrl || null,
						role: updatedProfile.role as UserRole,
						createdAt: updatedProfile.createdAt,
						updatedAt: updatedProfile.updatedAt
					}

					// Update local state
					set({
						user,
						error: null
					})

					return user
				} catch (error) {
					const errorMessage =
						error instanceof ApiClientError
							? error.message
							: 'Profile update failed'

					const authError = new AuthError(
						`Profile update failed: ${errorMessage}`,
						'PROFILE_UPDATE_ERROR',
						error instanceof Error ? error : undefined
					)
					logger.authEvent('profile_update_failed', currentUser.id, {
						error: errorMessage
					})
					toast.error(authError.message)
					throw authError
				}
			},
			{ operation: 'profile_update', component: 'authStore' }
		)

		if (!result) {
			throw new AuthError('Profile update failed')
		}
	},

	getCurrentUser: async () => {
		try {
			if (!apiClient.auth.isAuthenticated()) {
				return null
			}

			const userProfile = await apiClient.users.me()

			return {
				id: userProfile.id,
				email: userProfile.email,
				name: userProfile.name || null,
				phone: userProfile.phone || null,
				bio: userProfile.bio || null,
				avatarUrl: userProfile.avatarUrl || null,
				role: userProfile.role as UserRole,
				createdAt: userProfile.createdAt,
				updatedAt: userProfile.updatedAt
			}
		} catch (error) {
			if (error instanceof ApiClientError && error.isUnauthorized) {
				apiClient.auth.logout()
			}
			return null
		}
	},

	resetSessionCheck: () => {
		logger.info('Manually resetting session check circuit breaker')
		sessionCheckState.failureCount = 0
		sessionCheckState.isCircuitOpen = false
		sessionCheckState.lastFailTime = 0

		// Clear any error state
		set({ error: null })

		toast.success('Session check reset. You can try again.', {
			duration: 3000,
			id: 'session-check-reset'
		})
	},

	resetCircuitBreaker: () => {
		logger.info('Manually resetting auth circuit breaker')
		sessionCheckState.failureCount = 0
		sessionCheckState.isCircuitOpen = false
		sessionCheckState.lastFailTime = 0

		// Clear any error state
		set({ error: null })

		toast.success('Authentication circuit breaker reset successfully!', {
			duration: 3000,
			id: 'circuit-breaker-reset'
		})
	}
}))
