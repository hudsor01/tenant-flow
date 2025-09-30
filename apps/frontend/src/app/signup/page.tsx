'use client'

import { LoginLayout } from '@/components/auth/login-layout'
import { createClient } from '@/utils/supabase/client'
import type { LoginFormData, SignupFormData } from '@repo/shared/types/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function SignupPage() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const handleSignup = async (data: LoginFormData | SignupFormData) => {
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
						firstName,
						lastName,
						company: company || null
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
			title="Start Saving $30,000 Annually in 2 Minutes"
			subtitle="Join 10,000+ property managers already saving 20+ hours weekly. No credit card. No commitment. Just results."
			imageUrl="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
			content={{
				heading: 'Your 14-Day Transformation Starts Now',
				description:
					'Most users see measurable ROI in 7 days. We guarantee 40% NOI increase in 90 days or your money back. No setup fees, no contracts, cancel anytime.',
				stats: [
					{ value: '$2,400', label: 'Saved Per\nProperty' },
					{ value: '7 days', label: 'To First\nROI' },
					{ value: '60-day', label: 'Money-back\nGuarantee' }
				]
			}}
			authProps={{
				onSubmit: handleSignup,
				isLoading
			}}
		/>
	)
}
