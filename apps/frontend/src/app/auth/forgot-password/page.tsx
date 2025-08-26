import type { Metadata } from 'next/types'
import { Suspense } from 'react'
import { SimpleForgotPasswordForm } from '@/components/forms/supabase-forgot-password-form'
import { AuthLayout } from '@/components/layout/auth/layout'
import { ClientAuthGuard } from '@/components/auth/client-auth-guard'
import { SkeletonForm } from '@/components/ui/skeleton'

export const metadata: Metadata = {
	title: 'Reset Password | TenantFlow',
	description:
		"Reset your TenantFlow account password. We'll send you secure reset instructions."
}

export default function ForgotPasswordPage(_props: {
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
						<div className="w-full max-w-md mx-auto">
							<SkeletonForm />
						</div>
					}
				>
					<SimpleForgotPasswordForm />
				</Suspense>
			</AuthLayout>
		</ClientAuthGuard>
	)
}
