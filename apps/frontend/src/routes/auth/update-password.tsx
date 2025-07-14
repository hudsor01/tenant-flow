import { createFileRoute } from '@tanstack/react-router'
import { SupabaseUpdatePasswordForm } from '@/components/auth/SupabaseUpdatePasswordForm'

export const Route = createFileRoute('/auth/update-password')({
	component: UpdatePasswordPage,
})

function UpdatePasswordPage() {
	return <SupabaseUpdatePasswordForm />
}
