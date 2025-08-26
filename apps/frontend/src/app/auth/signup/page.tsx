<<<<<<< HEAD
import type { Metadata } from 'next/types'
=======
import type { Metadata } from '@/types/next.d'
>>>>>>> origin/main
import { Suspense } from 'react'
import { SimpleSignupForm } from '@/components/forms/supabase-signup-form'
import { AuthLayout } from '@/components/layout/auth/layout'
import { getCurrentUser } from '@/lib/actions/auth-actions'
import { AuthRedirect } from '@/components/auth/auth-redirect'
<<<<<<< HEAD
import { SkeletonForm } from '@/components/ui/skeleton'
=======
>>>>>>> origin/main

export const metadata: Metadata = {
	title: 'Sign Up | TenantFlow',
	description:
		'Create your TenantFlow account and start managing properties efficiently.'
}

export default async function SignupPage({
	searchParams
}: {
	searchParams: Promise<{ redirect?: string; error?: string }>
}) {
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
			title="Get Started"
			description="Create your account and start managing properties effortlessly"
			side="right"
			image={{
				src: '/property-management-og.jpg',
				alt: 'Property management platform'
			}}
			heroContent={{
				title: 'Start Your 14-Day Free Trial',
				description:
					'No credit card required. Get instant access to all features and see how TenantFlow can transform your property management.'
			}}
		>
			<Suspense
				fallback={
<<<<<<< HEAD
					<div className="mx-auto w-full max-w-md">
						<SkeletonForm />
					</div>
=======
					<div className="bg-muted h-[500px] animate-pulse rounded-lg" />
>>>>>>> origin/main
				}
			>
				<SimpleSignupForm redirectTo={redirectTo} />
			</Suspense>
		</AuthLayout>
	)
}
