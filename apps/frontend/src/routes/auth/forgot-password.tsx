import { createFileRoute } from '@tanstack/react-router'
import { SupabaseForgotPasswordForm } from '@/components/auth/forms/SupabaseForgotPasswordForm'
import AuthLayout from '@/components/auth/AuthLayout'

export const Route = createFileRoute('/auth/forgot-password')({
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	return (
		<AuthLayout
			title="Reset your password"
			subtitle="Enter your email address and we'll send you a link to reset your password."
			image={{
				src: '/images/roi-up_to_the_right.jpg',
				alt: 'Password reset illustration'
			}}
			heroContent={{
				title: 'Secure Reset',
				description: 'Reset your password securely and get back to managing your properties with TenantFlow.'
			}}
		>
			<SupabaseForgotPasswordForm />
		</AuthLayout>
	)
}
