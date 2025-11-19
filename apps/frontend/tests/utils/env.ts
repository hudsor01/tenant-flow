import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
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
 * Creates a Supabase browser client that is safe for integration tests.
 * Reuses the same validation logic for URL/key so TypeScript knows they are strings.
 */
export function createSupabaseTestClient(): SupabaseClient<Database> {
	const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL')
	const supabaseAnonKey = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

	return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

/**
 * Utility helper for bulk validation without manual loops sprinkled through tests.
 */
export function ensureEnvVars(names: readonly string[]): void {
	names.forEach(getRequiredEnvVar)
}
