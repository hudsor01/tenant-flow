import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? process.env['SUPABASE_URL']
const SUPABASE_PUBLISHABLE_KEY =
  process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_PUBLISHABLE_KEY']

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set for integration tests')
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
  // Accept either INTEGRATION_TEST_OWNER_* (explicit) or E2E_OWNER_* (shared with e2e-tests)
  const ownerAEmail =
    process.env['INTEGRATION_TEST_OWNER_A_EMAIL'] ?? process.env['E2E_OWNER_EMAIL']
  const ownerAPassword =
    process.env['INTEGRATION_TEST_OWNER_A_PASSWORD'] ?? process.env['E2E_OWNER_PASSWORD']
  const ownerBEmail =
    process.env['INTEGRATION_TEST_OWNER_B_EMAIL'] ?? process.env['E2E_OWNER_B_EMAIL']
  const ownerBPassword =
    process.env['INTEGRATION_TEST_OWNER_B_PASSWORD'] ?? process.env['E2E_OWNER_B_PASSWORD']

  if (!ownerAEmail || !ownerAPassword || !ownerBEmail || !ownerBPassword) {
    throw new Error(
      'Integration test credentials must be set. Use either:\n' +
        '  INTEGRATION_TEST_OWNER_A_EMAIL / INTEGRATION_TEST_OWNER_A_PASSWORD\n' +
        '  INTEGRATION_TEST_OWNER_B_EMAIL / INTEGRATION_TEST_OWNER_B_PASSWORD\n' +
        'or the shared E2E aliases:\n' +
        '  E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD / E2E_OWNER_B_EMAIL / E2E_OWNER_B_PASSWORD',
    )
  }

  return {
    ownerA: { email: ownerAEmail, password: ownerAPassword },
    ownerB: { email: ownerBEmail, password: ownerBPassword },
  }
}
