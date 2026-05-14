/**
 * Vitest globalSetup — runs ONCE before any test file forks spawn.
 *
 * Signs in every synthetic test user with a single auth API call per user,
 * persists the access + refresh tokens to a tmp file. Test files then read
 * the file and restore the session via `client.auth.setSession()` — which
 * does NOT hit the auth endpoint.
 *
 * Before this setup the RLS suite did `signInWithPassword` per test file
 * (31 files × 2 owners ≈ 62 sign-ins concentrated in <30s), regularly
 * tripping Supabase's ~45-per-minute auth rate limit. With globalSetup we
 * sign in once per owner — 2 sign-ins total for the whole suite.
 *
 * Path discipline: writes to `os.tmpdir()` (process-wide tmp) rather than
 * the repo so concurrent CI runs of different branches don't collide.
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const SESSION_CACHE_PATH = join(
	tmpdir(),
	`tenant-flow-test-sessions-${process.env['GITHUB_RUN_ID'] ?? process.pid}.json`
)

interface CachedSession {
	access_token: string
	refresh_token: string
}

type SessionCache = Record<string, CachedSession>

async function signInOnce(
	supabaseUrl: string,
	supabaseKey: string,
	email: string,
	password: string
): Promise<CachedSession> {
	const client = createClient(supabaseUrl, supabaseKey)
	const { data, error } = await client.auth.signInWithPassword({ email, password })
	if (error) {
		throw new Error(`globalSetup: failed to sign in as ${email}: ${error.message}`)
	}
	if (!data.session) {
		throw new Error(`globalSetup: no session returned for ${email}`)
	}
	return {
		access_token: data.session.access_token,
		refresh_token: data.session.refresh_token,
	}
}

export default async function setup(): Promise<() => Promise<void>> {
	const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
	const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
	if (!supabaseUrl || !supabaseKey) {
		throw new Error(
			'globalSetup: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing'
		)
	}

	const cache: SessionCache = {}

	// Owner A + Owner B — always required, fail loudly if missing.
	const ownerAEmail = process.env['E2E_OWNER_EMAIL']
	const ownerAPassword = process.env['E2E_OWNER_PASSWORD']
	const ownerBEmail = process.env['E2E_OWNER_B_EMAIL']
	const ownerBPassword = process.env['E2E_OWNER_B_PASSWORD']
	if (!ownerAEmail || !ownerAPassword || !ownerBEmail || !ownerBPassword) {
		throw new Error(
			'globalSetup: E2E owner credentials missing (E2E_OWNER_EMAIL / PASSWORD / B_EMAIL / B_PASSWORD)'
		)
	}
	cache[ownerAEmail] = await signInOnce(supabaseUrl, supabaseKey, ownerAEmail, ownerAPassword)
	cache[ownerBEmail] = await signInOnce(supabaseUrl, supabaseKey, ownerBEmail, ownerBPassword)

	// Tenant + admin — optional, only sign in if env is set.
	const tenantEmail = process.env['E2E_TENANT_EMAIL']
	const tenantPassword = process.env['E2E_TENANT_PASSWORD']
	if (tenantEmail && tenantPassword) {
		cache[tenantEmail] = await signInOnce(supabaseUrl, supabaseKey, tenantEmail, tenantPassword)
	}
	const adminEmail = process.env['E2E_ADMIN_EMAIL']
	const adminPassword = process.env['E2E_ADMIN_PASSWORD']
	if (adminEmail && adminPassword) {
		cache[adminEmail] = await signInOnce(supabaseUrl, supabaseKey, adminEmail, adminPassword)
	}

	writeFileSync(SESSION_CACHE_PATH, JSON.stringify(cache), 'utf-8')
	process.env['TEST_SESSION_CACHE_PATH'] = SESSION_CACHE_PATH

	// Vitest expects globalSetup to return a teardown function.
	return async () => {
		// Intentionally leave the cache file on disk — Supabase will GC sessions
		// after their natural TTL, and a stale read on the next run is handled by
		// the fallback `signInWithPassword` path in `createTestClient`.
	}
}
