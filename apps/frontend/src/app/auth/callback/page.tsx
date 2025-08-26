import { SupabaseAuthProcessor } from '@/components/auth/supabase-auth-processor'
import { QueryProvider } from '@/providers/query-provider'

// Force dynamic rendering for OAuth callback processing
// This prevents Next.js from statically generating this page at build time,
// which is required for handling dynamic OAuth code parameters
export const dynamic = 'force-dynamic'

interface AuthCallbackPageProps {
	searchParams: Record<string, string | string[] | undefined>
}

<<<<<<< HEAD
export default function AuthCallbackPage(_props: AuthCallbackPageProps) {
=======
export default function AuthCallbackPage({
	searchParams: _searchParams
}: AuthCallbackPageProps) {
>>>>>>> origin/main
	// Access to searchParams makes this page dynamic automatically
	// This ensures OAuth codes in URL parameters are properly handled
	return (
		<QueryProvider>
			<SupabaseAuthProcessor />
		</QueryProvider>
	)
}
