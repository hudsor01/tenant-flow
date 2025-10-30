/**
 * Client-Side API Helper
 * Gets token from Supabase client session and uses Authorization header
 */

import { createBrowserClient } from '@supabase/ssr'
import { api } from './api'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

function getSupabase() {
	if (!supabaseClient) {
		supabaseClient = createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
		)
	}
	return supabaseClient
}

/**
 * Client-side API helper that gets token from Supabase session
 * 
 * USAGE in Client Components:
 * ```ts
 * const data = await apiClient<Property[]>('properties')
 * ```
 */
export async function apiClient<T = unknown>(
	endpoint: string,
	options?: RequestInit
): Promise<T> {
	const supabase = getSupabase()
	const { data: { session } } = await supabase.auth.getSession()
	
	if (!session?.access_token) {
		throw new Error('No active session')
	}
	
	return api<T>(endpoint, {
		...options,
		token: session.access_token
	})
}
