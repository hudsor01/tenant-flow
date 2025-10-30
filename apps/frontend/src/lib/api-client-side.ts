/**
 * Client-Side API Helper
 * Gets token from Supabase client session and uses Authorization header
 */

import { createBrowserClient } from '@supabase/ssr'
import { api } from './api'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

function getSupabase() {
	if (!supabaseClient) {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

		if (!supabaseUrl) {
			throw new Error(
				'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please add it to your .env.local file.'
			)
		}

		if (!supabaseAnonKey) {
			throw new Error(
				'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable. Please add it to your .env.local file.'
			)
		}

		supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
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

	try {
		const { data, error } = await supabase.auth.getSession()

		if (error) {
			throw new Error(
				`Failed to retrieve session: ${error.message}. Check network and try again.`
			)
		}

		const session = data?.session

		if (!session?.access_token) {
			throw new Error('No active session — please sign in')
		}

		return api<T>(endpoint, {
			...options,
			token: session.access_token
		})
	} catch (err) {
		if (err instanceof Error) {
			throw new Error(
				`Failed to retrieve session: ${err.message}. Check network and try again.`
			)
		}
		throw new Error('Failed to retrieve session — check network and try again')
	}
}
