'use client'

import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type {
	LoginCredentials,
	LoginFormData,
	SignupFormData
} from '@repo/shared/types/auth'
import { Suspense, useEffect, useState } from 'react'
import React from 'react'
import { ForgotPasswordModal } from '#components/auth/forgot-password-modal'
import { LoginLayout } from '#components/auth/login-layout'
import { useModalStore } from '#stores/modal-store'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserRole } from '#hooks/use-user-role'

const logger = createLogger({ component: 'LoginPage' })

function LoginPageContent() {
	const [isLoading, setIsLoading] = useState(false)
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)
	const [justLoggedIn, setJustLoggedIn] = useState(false)
	const { openModal } = useModalStore()
	const router = useRouter()
	const searchParams = useSearchParams()
	const { isTenant, isLoading: roleLoading } = useUserRole()

	useEffect(() => {
		// Check if searchParams is available before using it
		if (!searchParams) return

		const error = searchParams.get('error')
		if (error === 'oauth_failed') {
			// Remove toast - let the form handle OAuth errors more gracefully
			router.replace('/login')
		}
	}, [searchParams, router])

	useEffect(() => {
		if (justLoggedIn && !roleLoading) {
			let destination = isTenant ? '/tenant' : '/manage'

			// Honor explicit redirectTo if provided (unless it conflicts with user_type)
			const redirectTo = searchParams?.get('redirectTo')
			if (
				redirectTo &&
				redirectTo.startsWith('/') &&
				!redirectTo.startsWith('//')
			) {
				destination = redirectTo
			}

			logger.info('Login successful, redirecting to dashboard', {
				action: 'email_login_success',
				metadata: {
					destination
				}
			})

			router.push(destination)
			router.refresh()
			setJustLoggedIn(false)
		}
	}, [justLoggedIn, roleLoading, isTenant, router, searchParams])

	const handleSubmit = async (data: LoginFormData | SignupFormData) => {
		setIsLoading(true)
		try {
			const supabase = getSupabaseClientInstance()

			// Validate and cast the data to LoginCredentials
			const credentials: LoginCredentials = {
				email: data.email as string,
				password: data.password as string
			}

			// Sign in with Supabase
			const { data: authData, error } = await supabase.auth.signInWithPassword({
				email: credentials.email,
				password: credentials.password
			})

			if (error) {
				logger.error('Login failed', {
					action: 'email_login_failed',
					metadata: {
						error: error.message,
						emailProvided: !!credentials.email
					}
				})

				if (error.message.includes('Email not confirmed')) {
					router.push('/auth/confirm-email')
					throw new Error(
						'Please confirm your email address before signing in.'
					)
				}

				throw new Error(
					error.message === 'Invalid login credentials'
						? 'Invalid email or password. Please try again.'
						: error.message
				)
			}

			if (authData.user) {
				logger.info('Login successful', {
					action: 'email_login_success',
					metadata: {
						email: credentials.email
					}
				})

				setJustLoggedIn(true)
			}
		} catch (error) {
			logger.error('Unexpected error during login', {
				action: 'email_login_unexpected_error',
				metadata: {
					error: error instanceof Error ? error.message : String(error)
				}
			})
			// Show error toast for unexpected errors
			// toast.error('Something went wrong', {
			// 	description:
			// 		'An unexpected error occurred during sign in. Please try again.'
			// })
		} finally {
			setIsLoading(false)
		}
	}

	const handleForgotPassword = () => {
		openModal('forgot-password')
	}

	const handleSignUp = () => {
		router.push('/signup')
	}

	const handleGoogleLogin = async () => {
		setIsGoogleLoading(true)
		try {
			const supabase = getSupabaseClientInstance()

			logger.info('Initiating Google OAuth login', {
				action: 'google_oauth_init',
				metadata: {
					origin: window.location.origin
				}
			})

			// OAuth with redirectTo for proper callback handling
			// Use the configured app URL for OAuth redirect to match Supabase settings
			const redirectUrl =
				process.env.NODE_ENV === 'development'
					? 'http://localhost:3000/auth/callback'
					: `${window.location.origin}/auth/callback`

			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: redirectUrl
				}
			})

			if (error) {
				logger.error('Google login failed', {
					action: 'google_login_failed',
					metadata: {
						error: error.message
					}
				})
			}
		} catch (error) {
			logger.error('Unexpected error during Google login', {
				action: 'google_login_unexpected_error',
				metadata: {
					error: error instanceof Error ? error.message : String(error)
				}
			})
		} finally {
			setIsGoogleLoading(false)
		}
	}

	return (
		<>
			<LoginLayout
				mode="login"
				title="Welcome Back to Your $30,000 Annual Savings"
				subtitle="Your properties are generating 40% more NOI while you've been away. Let's keep that momentum going."
				imageUrl="https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
				content={{
					heading: 'Your Success Dashboard Awaits',
					description:
						'Join 10,000+ property managers who check their dashboard daily to see vacancy rates drop, NOI increase, and hours saved multiply.',
					stats: [
						{ value: '$2.4K+', label: 'Saved Per\nProperty' },
						{ value: '98.7%', label: 'Customer\nSuccess' },
						{ value: '90 sec', label: 'Support\nResponse' }
					]
				}}
				authProps={{
					onSubmit: handleSubmit,
					onForgotPassword: handleForgotPassword,
					onSignUp: handleSignUp,
					onGoogleLogin: handleGoogleLogin,
					isLoading,
					isGoogleLoading
				}}
			/>

			<ForgotPasswordModal />
		</>
	)
}

// Wrap the component in Suspense to handle useSearchParams properly
export default function LoginPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<LoginPageContent />
		</Suspense>
	)
}
