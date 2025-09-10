'use client'

import { LoginLayout } from '@/components/auth/login-layout'
import { supabaseClient } from '@repo/shared'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function SignUpPage() {
	const router = useRouter()

	const handleSubmit = async (data: Record<string, unknown>) => {
		try {
			// Type assert the data to the expected shape
			const { email, password, name } = data as {
				email: string
				password: string
				name: string
			}

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

			const { data: _data, error } = await supabaseClient.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name: name
					}
				}
			})

			if (error) {
				let errorMessage = error.message
				if (error.message.includes('Failed to fetch')) {
					errorMessage =
						'Unable to connect to authentication service. Please check your network connection.'
				} else if (error.message.includes('User already registered')) {
					errorMessage =
						'An account with this email already exists. Please sign in instead.'
				}

				toast.error('Sign up failed', {
					description: errorMessage
				})
				return
			}

			if (_data.user) {
				toast.success('Account created successfully!', {
					description: 'Please check your email to verify your account.'
				})

				// Redirect to a confirmation page or dashboard
				router.push('/auth/sign-up-success')
			}
		} catch (error) {
			console.error('Sign up error:', error)

			let errorMessage = 'Please try again later.'
			if (error instanceof TypeError && error.message.includes('fetch')) {
				errorMessage =
					'Network connection failed. Please check your internet connection and try again.'
			}

			toast.error('Authentication Error', {
				description: errorMessage
			})
		}
	}

	const handleLogin = () => {
		router.push('/auth/login')
	}

	const handleGoogleSignUp = async () => {
		try {
			const { data: _oauthData, error } =
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

				toast.error('Google Sign-up failed', {
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
		}
	}

	return (
		<LoginLayout
			mode="signup"
			imageOnRight={true}
			imageUrl="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80"
			title="Join TenantFlow"
			subtitle="Create your account to start managing your properties with confidence"
			content={{
				heading: 'Build Your Portfolio',
				description:
					"Join property managers who've increased their efficiency by 75% and tenant satisfaction by 90% using TenantFlow's integrated platform.",
				stats: [
					{ value: '75%', label: 'Efficiency\nIncrease' },
					{ value: '30min', label: 'Setup\nTime' },
					{ value: '$50K+', label: 'Average\nSavings' }
				]
			}}
			onSubmit={handleSubmit}
			onLogin={handleLogin}
			onGoogleSignUp={handleGoogleSignUp}
		/>
	)
}
