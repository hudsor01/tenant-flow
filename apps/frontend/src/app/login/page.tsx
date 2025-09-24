'use client'

import type { LoginCredentials } from '@repo/shared'
import { createLogger, supabaseClient } from '@repo/shared'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal'
import { LoginLayout } from '@/components/auth/login-layout'
import { toast } from 'sonner'
import { loginAction } from './actions'

const logger = createLogger({ component: 'LoginPage' })

export default function LoginPage() {
	const [isLoading, setIsLoading] = useState(false)
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)
	const [showForgotPassword, setShowForgotPassword] = useState(false)
	const router = useRouter()
	const searchParams = useSearchParams()

	useEffect(() => {
		const error = searchParams?.get('error')
		if (error === 'oauth_failed') {
			toast.error('Authentication failed', {
				description:
					'There was an error signing in with Google. Please try again.'
			})
			router.replace('/login')
		}
	}, [searchParams, router])

	const handleSubmit = async (data: Record<string, unknown>) => {
		setIsLoading(true)
		try {
			// Validate and cast the data to LoginCredentials
			const credentials: LoginCredentials = {
				email: data.email as string,
				password: data.password as string
			}

			// Use server action for proper cookie-based authentication
			const result = await loginAction(credentials)

			if (!result.success) {
				logger.error('Login failed', {
					action: 'email_login_failed',
					metadata: {
						error: result.error,
						emailProvided: !!credentials.email
					}
				})

				// Redirect to email confirmation page if email not confirmed
				if (result.needsEmailConfirmation) {
					logger.info('Email not confirmed, redirecting to confirmation page', {
						action: 'redirect_to_email_confirmation'
					})
					router.push('/auth/confirm-email')
					return
				}

				// Show error toast for authentication failures
				toast.error('Sign in failed', {
					description: result.error?.includes('Invalid login credentials')
						? 'Invalid email or password. Please check your credentials and try again.'
						: result.error
				})
				return
			}

			// Success - server action will handle redirect
			logger.info('Login successful, redirecting to dashboard', {
				action: 'email_login_success',
				metadata: {
					email: credentials.email
				}
			})
			toast.success('Welcome back!', {
				description: `Signed in as ${credentials.email}`
			})
		} catch (error) {
			logger.error('Unexpected error during login', {
				action: 'email_login_unexpected_error',
				metadata: {
					error: error instanceof Error ? error.message : String(error)
				}
			})
			// Show error toast for unexpected errors
			toast.error('Something went wrong', {
				description:
					'An unexpected error occurred during sign in. Please try again.'
			})
		} finally {
			setIsLoading(false)
		}
	}

	const handleForgotPassword = () => {
		logger.info('Forgot password modal opened', {
			action: 'forgot_password_modal_opened'
		})
		setShowForgotPassword(true)
	}

	const handleSignUp = () => {
		router.push('/signup')
	}

	const handleGoogleLogin = async () => {
		setIsGoogleLoading(true)
		try {
			const { error } = await supabaseClient.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
						scope: 'openid email profile'
					}
				}
			})

			if (error) {
				logger.error('Google login failed', {
					action: 'google_login_failed',
					metadata: {
						error: error.message
					}
				})
				// Show error toast for Google login failures
				toast.error('Google sign in failed', {
					description:
						'Unable to sign in with Google. Please try again or use email and password.'
				})
			}
		} catch (error) {
			logger.error('Unexpected error during Google login', {
				action: 'google_login_unexpected_error',
				metadata: {
					error: error instanceof Error ? error.message : String(error)
				}
			})
			// Show error toast for unexpected Google login errors
			toast.error('Something went wrong', {
				description:
					'An unexpected error occurred during Google sign in. Please try again.'
			})
		} finally {
			setIsGoogleLoading(false)
		}
	}

	return (
		<>
			<LoginLayout
				mode="login"
				title="Welcome Back"
				subtitle="Sign in to your TenantFlow account to continue managing your properties"
				imageUrl="https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
				content={{
					heading: 'Professional Property Management Made Simple',
					description:
						'Cut administrative tasks by 75% and focus on growing your portfolio. Welcome back to efficient property management.',
					stats: [
						{ value: '75%', label: 'Time\nSaved' },
						{ value: '99.9%', label: 'Platform\nUptime' },
						{ value: 'SOC 2', label: 'Security\nCompliant' }
					]
				}}
				onSubmit={handleSubmit}
				onForgotPassword={handleForgotPassword}
				onSignUp={handleSignUp}
				onGoogleLogin={handleGoogleLogin}
				isLoading={isLoading}
				isGoogleLoading={isGoogleLoading}
			/>

			<ForgotPasswordModal
				open={showForgotPassword}
				onOpenChange={setShowForgotPassword}
			/>
		</>
	)
}
