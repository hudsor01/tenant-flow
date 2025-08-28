/**
 * Login Page - Server Component
 * Handles authentication flow with proper server/client separation
 */

import type { Metadata } from 'next/types'
import { Suspense } from 'react'
import { AuthLayout } from '@/components/layout/auth/layout'
import { SimpleLoginForm } from '@/components/forms/supabase-login-form'
import { getCurrentUser } from '@/app/actions/auth'
import { AuthRedirect } from '@/components/auth/auth-redirect'
import { SkeletonForm } from '@/components/ui/skeleton'

export const metadata: Metadata = {
	title: 'Sign In | TenantFlow',
	description:
		'Sign in to your TenantFlow account to access your property management dashboard.'
}

interface LoginPageProps {
	searchParams: Promise<{ redirect?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	// Await searchParams as required in Next.js 15
	const params = await searchParams

	// Check if user is already authenticated
	const user = await getCurrentUser()

	if (user) {
		return <AuthRedirect to={params?.redirect ?? '/dashboard'} />
	}

	const redirectTo = params?.redirect ?? '/dashboard'

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
				title: 'Streamline Your Property_ Management',
				description:
					'Join thousands of property owners who save hours every week with our powerful, intuitive platform.'
			}}
		>
			<Suspense
				fallback={
					<div className="mx-auto w-full max-w-md">
						<SkeletonForm />
					</div>
				}
			>
				<SimpleLoginForm redirectTo={redirectTo} />
			</Suspense>
		</AuthLayout>
	)
}
