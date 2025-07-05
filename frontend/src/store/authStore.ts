import { create } from 'zustand'
import { toast } from 'sonner'
import type { User, UserRole } from '@/types/auth'
import type { AuthStore, SessionCheckState } from '@/types/store'
import { supabase } from '@/lib/supabase'
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
					// Sign up with Supabase
					const { data: authData, error: signUpError } = await supabase.auth.signUp({
						email,
						password,
						options: {
							data: {
								name: name,
								full_name: name
							},
							emailRedirectTo: `${window.location.origin}/auth/callback`
						}
					})

					if (signUpError) {
						throw new Error(signUpError.message)
					}

					if (!authData.user) {
						throw new Error('Failed to create user account')
					}

					// Create user profile in database
					const { error: profileError } = await supabase
						.from('User')
						.insert({
							id: authData.user.id,
							email: email,
							name: name,
							role: 'OWNER',
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString()
						})
						.select()
						.single()

					if (profileError) {
						logger.warn('Profile creation failed, but auth succeeded', {
							error: profileError
						})
					}

					logger.authEvent('sign_up_success', authData.user.id, {
						email: email.split('@')[0]
					})

					// Track signup event in PostHog
					posthog?.capture('user_signed_up', {
						method: 'email',
						email: email,
						user_id: authData.user.id,
						timestamp: new Date().toISOString()
					})

					// Track signup event in Facebook Pixel
					FacebookPixel.trackCompleteRegistration('email')

					// Send to n8n automation workflow
					try {
						await fetch(
							`${import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.tenantflow.app'}/webhook-test/tenantflow-signup`,
							{
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({
									email: email,
									name: name,
									userId: authData.user.id,
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

					// Check if email confirmation is required
					if (authData.user && !authData.session) {
						// User created but session not established (email confirmation required)
						toast.success('Account created! Please check your email to confirm your account before signing in.')
						
						set({
							user: null, // Don't set user until confirmed
							isLoading: false,
							error: null
						})
						
						return authData.user
					} else {
						// User created and session established (no email confirmation required)
						toast.success('Account created successfully!')
						
						// Set user in state
						const user: User = {
							id: authData.user.id,
							email: email,
							name: name,
							phone: null,
							bio: null,
							avatarUrl: null,
							role: 'OWNER' as UserRole,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString()
						}

						set({
							user,
							isLoading: false,
							error: null
						})

						return authData.user
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Sign up failed'

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
					// Sign in with Supabase
					const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
						email,
						password
					})

					if (signInError) {
						// Provide specific guidance for email confirmation issues
						if (signInError.message === 'Email not confirmed') {
							throw new Error(
								'Please check your email and click the confirmation link before signing in. Check your spam folder if you don\'t see the email.'
							)
						}
						throw new Error(signInError.message)
					}

					if (!authData.user) {
						throw new Error('Failed to sign in')
					}

					logger.authEvent('sign_in_success', authData.user.id, {
						email: email.split('@')[0]
					})
					toast.info('Loading profile...')

					// Get the full user profile from database
					const { data: userProfile, error: profileError } = await supabase
						.from('User')
						.select('*')
						.eq('id', authData.user.id)
						.single()
					let profile = userProfile

					if (profileError || !profile) {
						logger.warn('Profile not found, creating basic profile', {
							error: profileError
						})
						
						// Create basic profile if it doesn't exist
						const { data: newProfile } = await supabase
							.from('User')
							.insert({
								id: authData.user.id,
								email: email,
								name: authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || email.split('@')[0],
								role: 'OWNER',
								createdAt: new Date().toISOString(),
								updatedAt: new Date().toISOString()
							})
							.select()
							.single()

						if (newProfile) {
							profile = newProfile
						}
					}

					logger.authEvent('profile_loaded', authData.user.id)

					const user: User = {
						id: authData.user.id,
						email: authData.user.email!,
						name: profile?.name || authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || null,
						phone: profile?.phone || null,
						bio: profile?.bio || null,
						avatarUrl: profile?.avatarUrl || null,
						role: (profile?.role as UserRole) || 'OWNER',
						createdAt: profile?.createdAt || authData.user.created_at,
						updatedAt: profile?.updatedAt || authData.user.updated_at
					}

					// Track login event and identify user in PostHog
					posthog?.capture('user_logged_in', {
						method: 'email',
						email: email,
						user_id: user.id,
						timestamp: new Date().toISOString()
					})

					posthog?.identify(user.id, {
						email: user.email,
						name: user.name,
						created_at: user.createdAt
					})

					// Track login event in Facebook Pixel
					FacebookPixel.trackCustomEvent('UserLogin', {
						method: 'email',
						user_id: user.id
					})

					toast.success('Successfully signed in!')

					set({
						user,
						isLoading: false
					})

					return user
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Sign in failed'

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
					// Sign out with Supabase
					const { error } = await supabase.auth.signOut()

					if (error) {
						throw new Error(error.message)
					}

					logger.authEvent('sign_out_success', currentUser?.id)
					toast.success('Successfully signed out!')

					set({
						user: null,
						isLoading: false,
						error: null
					})

					return true
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Sign out failed'

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

			// Get current session from Supabase
			const { data: { session } } = await supabase.auth.getSession()

			logger.authEvent('session_retrieved', undefined, {
				hasSession: !!session
			})

			if (session?.user) {
				try {
					logger.authEvent('profile_lookup_start')

					// Get the current user profile from database
					const { data: userProfile, error: profileError } = await supabase
						.from('User')
						.select('*')
						.eq('id', session.user.id)
						.single()
					let profile = userProfile

					if (profileError || !profile) {
						logger.warn('Profile not found in database', {
							error: profileError,
							userId: session.user.id
						})

						// Create basic profile if it doesn't exist
						const { data: newProfile } = await supabase
							.from('User')
							.insert({
								id: session.user.id,
								email: session.user.email!,
								name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
								role: 'OWNER',
								createdAt: new Date().toISOString(),
								updatedAt: new Date().toISOString()
							})
							.select()
							.single()

						profile = newProfile || {
							id: session.user.id,
							email: session.user.email!,
							name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || null,
							role: 'OWNER',
							createdAt: session.user.created_at,
							updatedAt: session.user.updated_at
						}
					}

					logger.info('Profile loaded successfully', {
						userId: profile.id
					})

					// Identify user in PostHog on session check
					posthog?.identify(profile.id, {
						email: profile.email,
						name: profile.name,
						created_at: profile.createdAt
					})

					// Reset circuit breaker on success
					sessionCheckState.failureCount = 0
					sessionCheckState.isCircuitOpen = false

					const user: User = {
						id: profile.id,
						email: profile.email,
						name: profile.name || null,
						phone: profile.phone || null,
						bio: profile.bio || null,
						avatarUrl: profile.avatarUrl || null,
						role: profile.role as UserRole,
						createdAt: profile.createdAt,
						updatedAt: profile.updatedAt
					}

					logger.authEvent('session_check_success', profile.id)
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
						const errorMessage = error instanceof Error ? error.message : 'Unknown error'

						logger.authEvent('profile_not_found', undefined, {
							error: errorMessage,
							failureCount: sessionCheckState.failureCount
						})
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
					// Update user profile in database
					const { data: updatedProfile, error } = await supabase
						.from('User')
						.update({
							name: updates.name !== undefined ? updates.name : currentUser.name,
							phone: updates.phone !== undefined ? updates.phone : currentUser.phone,
							bio: updates.bio !== undefined ? updates.bio : currentUser.bio,
							avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : currentUser.avatarUrl,
							updatedAt: new Date().toISOString()
						})
						.eq('id', currentUser.id)
						.select()
						.single()

					if (error) {
						throw new Error(error.message)
					}

					if (!updatedProfile) {
						throw new Error('Failed to update profile')
					}

					logger.authEvent('profile_update_success', currentUser.id)

					const user: User = {
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
					const errorMessage = error instanceof Error ? error.message : 'Profile update failed'

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
			// Get current session from Supabase
			const { data: { session } } = await supabase.auth.getSession()

			if (!session?.user) {
				return null
			}

			// Get user profile from database
			const { data: profile, error } = await supabase
				.from('User')
				.select('*')
				.eq('id', session.user.id)
				.single()

			if (error || !profile) {
				return null
			}

			return {
				id: profile.id,
				email: profile.email,
				name: profile.name || null,
				phone: profile.phone || null,
				bio: profile.bio || null,
				avatarUrl: profile.avatarUrl || null,
				role: profile.role as UserRole,
				createdAt: profile.createdAt,
				updatedAt: profile.updatedAt
			}
		} catch {
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
