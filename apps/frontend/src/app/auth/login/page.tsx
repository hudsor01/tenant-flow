/**
 * Login Page - Server Component
 * Handles authentication flow with proper server/client separation
 */

import type { Metadata } from 'next/types'
import { AuthLayout } from '@/components/layout/auth/layout'
import { LoginForm } from '@/components/forms/supabase-login-form'
import { getCurrentUser } from '@/app/actions/auth'
import { AuthRedirect } from '@/components/auth/auth-redirect'

export const metadata: Metadata = {
	title: 'Sign In | TenantFlow',
	description:
		'Sign in to your TenantFlow account to access your property management dashboard.'
}

interface LoginPageProps {
    // Next 15 passes a promise; support both 'redirect' and 'redirectTo'
    searchParams: Promise<Record<string, string | undefined>>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams

	// Check if user is already authenticated
	const user = await getCurrentUser()

    if (user) {
        return <AuthRedirect to={(params?.redirect || params?.redirectTo) ?? '/dashboard'} />
    }

    const redirectTo = (params?.redirect || params?.redirectTo) ?? '/dashboard'

	return (
		<AuthLayout
			title="Sign In"
			subtitle="Welcome back to TenantFlow"
			description="Enter your credentials to access your dashboard"
			side="left"
			image={{
				src: '/images/roi-up_to_the_right.jpg',
				alt: 'Modern property management dashboard'
			}}
			heroContent={{
				title: 'Streamline Your Property Management',
				description:
					'Join thousands of property owners who save hours every week with our powerful, intuitive platform.'
			}}
		>
			<LoginForm redirectTo={redirectTo} />
		</AuthLayout>
	)
}
