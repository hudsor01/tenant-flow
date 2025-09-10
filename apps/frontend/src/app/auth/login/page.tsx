'use client'

import { LoginLayout } from '@/components/auth/login-layout'
import { supabaseClient } from '@repo/shared/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
	const router = useRouter()

	// TanStack Query mutations replacing manual loading states
	const loginMutation = useMutation({
		mutationFn: async (data: { email: string; password: string }) => {
			// Check if we're using placeholder/development credentials
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

			if (
				!supabaseUrl ||
				!supabaseKey ||
				supabaseUrl.includes('placeholder') ||
				supabaseKey.includes('placeholder')
			) {
				throw new Error(
					'Development Environment: Authentication is not configured for local development. Please use production credentials or contact your administrator.'
				)
			}

			const { data: authData, error } =
				await supabaseClient.auth.signInWithPassword({
					email: data.email,
					password: data.password
				})

			if (error) {
				// Provide more specific error messages
				let errorMessage = error.message
				if (error.message.includes('Failed to fetch')) {
					errorMessage =
						'Unable to connect to authentication service. Please check your network connection.'
				} else if (error.message.includes('Invalid login credentials')) {
					errorMessage = 'Invalid email or password. Please try again.'
				}
				throw new Error(errorMessage)
			}

			return authData.user
		},
		onSuccess: user => {
			if (user) {
				toast.success('Welcome back!', {
					description: 'You have been successfully logged in.'
				})

				// Check if there's a redirect URL
				const searchParams = new URLSearchParams(window.location.search)
				const redirectTo = searchParams.get('redirectTo') || '/dashboard'

				router.push(redirectTo)
			}
		},
		onError: error => {
			console.error('Login error:', error)

			// Provide better error messages for different error types
			let errorMessage =
				error instanceof Error ? error.message : 'Please try again later.'
			if (error instanceof TypeError && error.message.includes('fetch')) {
				errorMessage =
					'Network connection failed. Please check your internet connection and try again.'
			}

			toast.error(
				error.message.includes('Development Environment')
					? 'Development Environment'
					: 'Login failed',
				{
					description: errorMessage
				}
			)
		}
	})

	const googleLoginMutation = useMutation({
		mutationFn: async () => {
			const { data: oauthData, error } =
				await supabaseClient.auth.signInWithOAuth({
					provider: 'google',
					options: {
						redirectTo: `${window.location.origin}/auth/oauth?next=/dashboard`,
						queryParams: {
							access_type: 'offline',
							prompt: 'consent'
						}
					}
				})

			if (error) {
				let errorMessage = error.message
				if (error.message.includes('Failed to fetch')) {
					errorMessage =
						'Unable to connect to Google. Please check your network connection and try again.'
				}
				throw new Error(errorMessage)
			}

			return oauthData
		},
		onError: error => {
			console.error('Google OAuth error:', error)
			toast.error('Google Sign-in failed', {
				description:
					error instanceof Error ? error.message : 'Please try again later.'
			})
		}
	})

	const handleSubmit = async (data: Record<string, unknown>) => {
		const { email, password } = data as { email: string; password: string }
		loginMutation.mutate({ email, password })
	}

	const handleForgotPassword = () => {
		router.push('/auth/forgot-password')
	}

	const handleSignUp = () => {
		router.push('/auth/register')
	}

	const handleGoogleLogin = async () => {
		googleLoginMutation.mutate()
	}

	return (
		<LoginLayout
			onSubmit={handleSubmit}
			onForgotPassword={handleForgotPassword}
			onSignUp={handleSignUp}
			onGoogleLogin={handleGoogleLogin}
			isLoading={loginMutation.isPending}
			isGoogleLoading={googleLoginMutation.isPending}
		/>
	)
}
