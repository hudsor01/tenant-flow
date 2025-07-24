import { createClient } from '@supabase/supabase-js'

// Environment validation
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables')
}

/**
 * Main Supabase client for authenticated operations
 * Persists sessions and handles automatic token refresh
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseClient = supabase

/**
 * Anonymous Supabase client for public operations
 * Used for invitation acceptance and other public operations
 * Does not persist sessions
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: false,
		autoRefreshToken: false,
		detectSessionInUrl: false,
		flowType: 'implicit'
	},
	global: {
		headers: {
			apikey: supabaseAnonKey
		}
	}
})