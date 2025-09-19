'use client'

import { authApi } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoginLayout } from 'src/components/auth/login-layout'

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

			// Use backend registration; tokens may require email confirmation
			await authApi.register({
				email,
				firstName: name.split(' ')[0] ?? '',
				lastName: name.split(' ').slice(1).join(' ') ?? '',
				password
			})
			toast.success('Account created successfully!', {
				description: 'Please check your email to verify your account.'
			})
			router.push('/auth/sign-up-success')
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
			// Defer to existing OAuth redirect flow via Supabase client
			const { error } = await (
				await import('@repo/shared')
			).supabaseClient.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/auth/oauth?next=/dashboard`,
					queryParams: { access_type: 'offline', prompt: 'consent' }
				}
			})
			if (error) throw error
			// Redirect handled by provider
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
