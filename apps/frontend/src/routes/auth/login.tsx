import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/SupabaseLoginForm'
import AuthLayout from '@/components/auth/AuthLayout'

export const Route = createFileRoute('/auth/login')({
	component: LoginPage,
})

function LoginPage() {
	return (
		<AuthLayout
			title="Sign in to your account"
			subtitle="Access your TenantFlow dashboard and manage your properties."
			image={{
				src: '/images/roi-up_to_the_right.jpg',
				alt: 'Property investment growth illustration'
			}}
			heroContent={{
				title: 'Welcome Back',
				description: 'Sign in to continue managing your properties with TenantFlow.'
			}}
		>
			<LoginForm />
		</AuthLayout>
	)
}
