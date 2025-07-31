import { createFileRoute } from '@tanstack/react-router'
import { SupabaseLoginForm as LoginForm } from '@/components/auth/forms/SupabaseLoginForm'
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
				src: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800&h=600&fit=crop&crop=edges',
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
