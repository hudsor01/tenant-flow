import { createFileRoute } from '@tanstack/react-router'
import SupabaseAuthProcessor from '@/components/auth/SupabaseAuthProcessor'

export const Route = createFileRoute('/auth/callback')({
	component: AuthCallbackPage,
})

function AuthCallbackPage() {
	return <SupabaseAuthProcessor />
}
