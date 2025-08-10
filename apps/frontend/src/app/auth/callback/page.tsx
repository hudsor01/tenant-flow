import { SupabaseAuthProcessor } from '@/components/auth/supabase-auth-processor'
import { QueryProvider } from '@/providers/query-provider'

// Force dynamic rendering for OAuth callback processing
// This prevents Next.js from statically generating this page at build time,
// which is required for handling dynamic OAuth code parameters
export const dynamic = 'force-dynamic'

interface AuthCallbackPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function AuthCallbackPage({ searchParams }: AuthCallbackPageProps) {
  // Access to searchParams makes this page dynamic automatically
  // This ensures OAuth codes in URL parameters are properly handled
  return (
    <QueryProvider>
      <SupabaseAuthProcessor />
    </QueryProvider>
  )
}