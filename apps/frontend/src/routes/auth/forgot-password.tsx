import { createFileRoute } from '@tanstack/react-router'
import { SupabaseForgotPasswordForm } from '@/components/auth/SupabaseForgotPasswordForm'

export const Route = createFileRoute('/auth/forgot-password')({
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	return <SupabaseForgotPasswordForm />
}
