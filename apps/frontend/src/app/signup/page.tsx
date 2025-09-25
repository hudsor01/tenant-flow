'use client'

import { LoginLayout } from '@/components/auth/login-layout'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function SignupPage() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const handleSignup = async (data: Record<string, unknown>) => {
		setIsLoading(true)
		const supabase = createClient()

		try {
			const { email, password, firstName, lastName, company } = data as {
				email: string
				password: string
				firstName: string
				lastName: string
				company?: string
			}

			const { data: authData, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						first_name: firstName,
						last_name: lastName,
						company: company || null,
						full_name: `${firstName} ${lastName}`
					}
				}
			})

			if (error) {
				toast.error('Signup failed', {
					description: error.message
				})
				return
			}

			if (authData?.user) {
				// Check if email confirmation is required
				if (!authData.user.confirmed_at) {
					toast.success('Account created!', {
						description: 'Please check your email to confirm your account.'
					})
					router.push('/auth/confirm-email')
				} else {
					toast.success('Welcome to TenantFlow!', {
						description: 'Your account has been created successfully.'
					})
					router.push('/dashboard')
				}
			}
		} catch {
			toast.error('An unexpected error occurred', {
				description: 'Please try again later.'
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<LoginLayout
			mode="signup"
			title="Create Your Account"
			subtitle="Start managing properties more efficiently in minutes"
			imageUrl="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
			content={{
				heading: 'Start Your Free Trial',
				description:
					'Reduce time spent on paperwork by 75% and increase tenant satisfaction. See why property managers are switching to TenantFlow.',
				stats: [
					{ value: '75%', label: 'Less\nPaperwork' },
					{ value: '30-Day', label: 'Free\nTrial' },
					{ value: 'No CC', label: 'Required' }
				]
			}}
			onSubmit={handleSignup}
			isLoading={isLoading}
		/>
	)
}
