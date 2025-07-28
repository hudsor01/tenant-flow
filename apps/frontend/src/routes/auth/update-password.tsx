import { createFileRoute } from '@tanstack/react-router'
import { SupabaseUpdatePasswordForm } from '@/components/auth/forms/SupabaseUpdatePasswordForm'
import AuthLayout from '@/components/auth/AuthLayout'

export const Route = createFileRoute('/auth/update-password')({
	component: UpdatePasswordPage,
})

function UpdatePasswordPage() {
	return (
		<AuthLayout
			title="Update your password"
			subtitle="Enter your new password to secure your account."
			image={{
				src: '/images/roi-up_to_the_right.jpg',
				alt: 'Password update illustration'
			}}
			heroContent={{
				title: 'Secure Update',
				description: 'Update your password and continue managing your properties securely with TenantFlow.'
			}}
		>
			<SupabaseUpdatePasswordForm />
		</AuthLayout>
	)
}
