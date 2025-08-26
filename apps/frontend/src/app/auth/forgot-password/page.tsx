<<<<<<< HEAD
import type { Metadata } from 'next/types'
=======
import type { Metadata } from '@/types/next.d'
>>>>>>> origin/main
import { Suspense } from 'react'
import { SimpleForgotPasswordForm } from '@/components/forms/supabase-forgot-password-form'
import { AuthLayout } from '@/components/layout/auth/layout'
import { ClientAuthGuard } from '@/components/auth/client-auth-guard'
<<<<<<< HEAD
import { SkeletonForm } from '@/components/ui/skeleton'
=======
>>>>>>> origin/main

export const metadata: Metadata = {
	title: 'Reset Password | TenantFlow',
	description:
		"Reset your TenantFlow account password. We'll send you secure reset instructions."
}

<<<<<<< HEAD
export default function ForgotPasswordPage(_props: {
=======
export default function ForgotPasswordPage({
	searchParams
}: {
>>>>>>> origin/main
	searchParams: { error?: string }
}) {
	return (
		<ClientAuthGuard>
			<AuthLayout
				title="Reset Password"
				subtitle="Forgot your password?"
				description="No worries, we'll send you reset instructions"
				side="left"
				image={{
					src: '/tenant-screening-og.jpg',
					alt: 'Secure password reset'
				}}
				heroContent={{
					title: 'Secure Password Recovery',
					description:
						"Your account security is our priority. We'll help you regain access quickly and safely."
				}}
			>
				<Suspense
					fallback={
<<<<<<< HEAD
						<div className="w-full max-w-md mx-auto">
							<SkeletonForm />
						</div>
=======
						<div className="bg-muted h-[300px] animate-pulse rounded-lg" />
>>>>>>> origin/main
					}
				>
					<SimpleForgotPasswordForm />
				</Suspense>
			</AuthLayout>
		</ClientAuthGuard>
	)
}
