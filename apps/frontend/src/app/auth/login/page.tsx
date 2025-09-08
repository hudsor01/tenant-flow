'use client'

import { LoginLayout } from '@/components/auth/login-layout'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function LoginPage() {
	const router = useRouter()
	const supabase = createClient()
	const [isLoading, setIsLoading] = useState(false)
	const [isGoogleLoading, setIsGoogleLoading] = useState(false)

	const handleSubmit = async (data: { email: string; password: string }) => {
		setIsLoading(true)
		try {
			// Check if we're using placeholder/development credentials
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
			const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

			if (
				!supabaseUrl ||
				!supabaseKey ||
				supabaseUrl.includes('placeholder') ||
				supabaseKey.includes('placeholder')
			) {
				toast.error('Development Environment', {
					description:
						'Authentication is not configured for local development. Please use production credentials or contact your administrator.'
				})
				return
			}

			const { data: _data, error } = await supabase.auth.signInWithPassword({
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

				toast.error('Login failed', {
					description: errorMessage
				})
				return
			}

			if (_data.user) {
				toast.success('Welcome back!', {
					description: 'You have been successfully logged in.'
				})

				// Check if there's a redirect URL
				const searchParams = new URLSearchParams(window.location.search)
				const redirectTo = searchParams.get('redirectTo') || '/dashboard'

				router.push(redirectTo)
			}
		} catch (error) {
			console.error('Login error:', error)

			// Provide better error messages for different error types
			let errorMessage = 'Please try again later.'
			if (error instanceof TypeError && error.message.includes('fetch')) {
				errorMessage =
					'Network connection failed. Please check your internet connection and try again.'
			}

			toast.error('Authentication Error', {
				description: errorMessage
			})
		} finally {
			setIsLoading(false)
		}
	}

	const handleForgotPassword = () => {
		router.push('/auth/forgot-password')
	}

	const handleSignUp = () => {
		router.push('/auth/register')
	}

	const handleGoogleLogin = async () => {
		setIsGoogleLoading(true)
		try {
			const { data: _oauthData, error } = await supabase.auth.signInWithOAuth({
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

				toast.error('Google Sign-in failed', {
					description: errorMessage
				})
				return
			}

			// OAuth redirect will be handled automatically
		} catch (error) {
			console.error('Google OAuth error:', error)
			toast.error('Authentication Error', {
				description: 'Please try again later.'
			})
		} finally {
			setIsGoogleLoading(false)
		}
	}

	return (
		<LoginLayout
			onSubmit={handleSubmit}
			onForgotPassword={handleForgotPassword}
			onSignUp={handleSignUp}
			onGoogleLogin={handleGoogleLogin}
			isLoading={isLoading}
			isGoogleLoading={isGoogleLoading}
		/>
	)
}
