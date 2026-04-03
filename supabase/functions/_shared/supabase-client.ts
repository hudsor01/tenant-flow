// Shared Supabase admin (service-role) client factory for Edge Functions.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client using the service role key.
 * This is the admin client used for DB operations that bypass RLS.
 */
export function createAdminClient(supabaseUrl: string, serviceRoleKey: string): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey)
}
