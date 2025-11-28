/**
 * Browser Supabase Client
 *
 * Use this for client-side operations in React components.
 * For server-side operations, use dal.ts (getClaims) or lib/api/server.ts (serverFetch).
 *
 * Pattern: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@repo/shared/types/supabase'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'

/**
 * Create a Supabase client for browser/client components
 *
 * IMPORTANT: This client is for client-side use only.
 * - Use getClaims() from dal.ts for Server Components
 * - Use serverFetch() from lib/api/server.ts for server-side API calls
 */
export function createClient() {
	if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
		throw new Error(
			'Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set.'
		)
	}

	return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
}
