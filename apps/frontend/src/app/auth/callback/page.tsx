'use client'

import { SupabaseAuthProcessor } from '@/components/auth/supabase-auth-processor'
import { QueryProvider } from '@/providers/query-provider'

export default function AuthCallbackPage() {
  return (
    <QueryProvider>
      <SupabaseAuthProcessor />
    </QueryProvider>
  )
}