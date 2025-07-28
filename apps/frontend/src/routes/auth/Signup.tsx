import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SupabaseSignupForm as SignUpForm } from '@/components/auth/forms/SupabaseSignupForm'
import AuthLayout from '@/components/auth/AuthLayout'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'

const signupSearchSchema = z.object({
	redirect: z.string().optional(),
})

export const Route = createFileRoute('/auth/Signup')({
	component: SignupComponent,
	validateSearch: signupSearchSchema,
})

function SignupComponent() {
	const { user } = useAuth()
	const navigate = useNavigate()

	// Redirect authenticated users
	if (user) {
		navigate({ to: '/dashboard' })
		return null
	}

	return (
		<AuthLayout
			title="Create your account"
			subtitle="Join thousands of successful landlords managing their properties with TenantFlow."
			image={{
				src: '/images/roi-up_to_the_right.jpg',
				alt: 'Property investment growth illustration'
			}}
			heroContent={{
				title: 'Start Your Journey',
				description: 'Create your account and begin managing your properties with confidence using TenantFlow\'s comprehensive platform.'
			}}
		>
			<SignUpForm />
		</AuthLayout>
	)
}
