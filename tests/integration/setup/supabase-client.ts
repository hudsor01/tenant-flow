import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_PUBLISHABLE_KEY = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  )
}

/**
 * Create a Supabase client authenticated as a specific test user.
 * The session JWT is used for all PostgREST calls, so RLS (auth.uid()) resolves correctly.
 */
export async function createTestClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Failed to sign in as ${email}: ${error.message}`)
  return client
}

export function getTestCredentials(): {
  ownerA: { email: string; password: string }
  ownerB: { email: string; password: string }
} {
  const ownerAEmail = process.env['E2E_OWNER_EMAIL']
  const ownerAPassword = process.env['E2E_OWNER_PASSWORD']
  const ownerBEmail = process.env['E2E_OWNER_B_EMAIL']
  const ownerBPassword = process.env['E2E_OWNER_B_PASSWORD']

  if (!ownerAEmail || !ownerAPassword || !ownerBEmail || !ownerBPassword) {
    throw new Error(
      'Missing required env vars: E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD, E2E_OWNER_B_EMAIL, E2E_OWNER_B_PASSWORD',
    )
  }

  return {
    ownerA: { email: ownerAEmail, password: ownerAPassword },
    ownerB: { email: ownerBEmail, password: ownerBPassword },
  }
}

/**
 * Returns tenant test credentials from env vars.
 * Returns null if credentials are not configured (tests should skip gracefully).
 */
export function getTenantTestCredentials(): {
  tenantA: { email: string; password: string }
} | null {
  const tenantAEmail = process.env['E2E_TENANT_EMAIL']
  const tenantAPassword = process.env['E2E_TENANT_PASSWORD']

  if (!tenantAEmail || !tenantAPassword) {
    return null
  }

  return { tenantA: { email: tenantAEmail, password: tenantAPassword } }
}
