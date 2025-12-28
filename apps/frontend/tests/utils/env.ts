import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase'

/**
 * Ensures an environment variable is defined before tests run.
 * Throws with a helpful message so CI/devs can fix configuration fast.
 */
export function getRequiredEnvVar(name: string): string {
	const value = process.env[name]

	if (!value) {
		throw new Error(
			`Missing required environment variable: ${name}. ` +
				'Set it in .env.test.local before running integration tests.'
		)
	}

	return value
}

/**
 * Creates a Supabase client for integration tests.
 * Uses the standard createClient (not createBrowserClient from @supabase/ssr)
 * because jsdom doesn't fully support document.cookie which @supabase/ssr requires.
 */
export function createSupabaseTestClient(): SupabaseClient<Database> {
	const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL')
	const supabaseAnonKey = getRequiredEnvVar(
		'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
	)

	return createClient<Database>(supabaseUrl, supabaseAnonKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true
		}
	})
}

/**
 * Utility helper for bulk validation without manual loops sprinkled through tests.
 */
export function ensureEnvVars(names: readonly string[]): void {
	names.forEach(getRequiredEnvVar)
}
