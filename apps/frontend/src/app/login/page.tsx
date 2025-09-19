'use client'

import type { LoginCredentials } from '@repo/shared'
import { supabaseClient } from '@repo/shared'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

import { toast } from 'sonner'
import { LoginLayout } from '@/components/auth/login-layout'
import { loginAction } from './actions'

export default function LoginPage() {
	const [isLoading, setIsLoading] = useState(false)
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)
	const router = useRouter()
	const searchParams = useSearchParams()

	useEffect(() => {
		const error = searchParams?.get('error')
		if (error === 'oauth_failed') {
			toast.error('Authentication failed', {
				description: 'There was an error signing in with Google. Please try again.'
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
				console.error('Login error:', result.error)

				// Redirect to email confirmation page if email not confirmed
				if (result.needsEmailConfirmation) {
					console.info('Email not confirmed, redirecting to confirmation page')
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
			console.info('Login successful, redirecting to dashboard')
			toast.success('Welcome back!', {
				description: `Signed in as ${credentials.email}`
			})
		} catch (error) {
			console.error('Unexpected error during login:', error)
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
		console.info('Forgot password clicked')
		// TODO: Implement forgot password functionality
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
				console.error('Google login error:', error.message)
				// Show error toast for Google login failures
				toast.error('Google sign in failed', {
					description:
						'Unable to sign in with Google. Please try again or use email and password.'
				})
			}
		} catch (error) {
			console.error('Unexpected error during Google login:', error)
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
	)
}
