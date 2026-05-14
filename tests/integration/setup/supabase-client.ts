import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_PUBLISHABLE_KEY = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  )
}

interface CachedSession {
  access_token: string
  refresh_token: string
}

type SessionCache = Record<string, CachedSession>

/**
 * Read the session cache written by `global-auth-setup.ts` (vitest globalSetup).
 * Returns null if the cache file doesn't exist OR is unreadable — caller falls
 * back to `signInWithPassword`.
 */
function readSessionCache(): SessionCache | null {
  const cachePath = process.env['TEST_SESSION_CACHE_PATH']
  if (!cachePath || !existsSync(cachePath)) return null
  try {
    return JSON.parse(readFileSync(cachePath, 'utf-8')) as SessionCache
  } catch {
    return null
  }
}

/**
 * Create a Supabase client authenticated as a specific test user.
 *
 * Fast path: if `global-auth-setup.ts` already signed in this user, restore
 * the cached session via `setSession()` — zero auth API calls.
 *
 * Slow path: cache miss → fall back to `signInWithPassword`. Used for local
 * runs where globalSetup wasn't configured, or for users that weren't
 * pre-cached.
 *
 * The session JWT is used for all PostgREST calls, so RLS (auth.uid())
 * resolves correctly either way.
 */
export async function createTestClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!)

  const cache = readSessionCache()
  const cached = cache?.[email]
  if (cached) {
    const { error } = await client.auth.setSession({
      access_token: cached.access_token,
      refresh_token: cached.refresh_token,
    })
    if (!error) return client
    // setSession failed (token expired / invalidated) — fall through to signin
  }

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

/**
 * Returns admin test credentials from env vars.
 * Returns null if credentials are not configured (tests should skip gracefully).
 */
export function getAdminTestCredentials(): {
  admin: { email: string; password: string }
} | null {
  const adminEmail = process.env['E2E_ADMIN_EMAIL']
  const adminPassword = process.env['E2E_ADMIN_PASSWORD']

  if (!adminEmail || !adminPassword) {
    return null
  }

  return { admin: { email: adminEmail, password: adminPassword } }
}
