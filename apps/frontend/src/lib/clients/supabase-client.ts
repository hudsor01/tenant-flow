import { createClient } from '@supabase/supabase-js'

// Environment validation
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	console.warn('Missing Supabase environment variables. Some features may not work properly.')
	// Create mock clients for development when env vars are missing
}

// Create clients only once as singletons
let _supabase: ReturnType<typeof createClient> | null = null
let _supabaseAnon: ReturnType<typeof createClient> | null = null

/**
 * Main Supabase client for authenticated operations
 * Persists sessions and handles automatic token refresh
 */
export const supabase = (() => {
	if (_supabase) return _supabase
	if (supabaseUrl && supabaseAnonKey) {
		_supabase = createClient(supabaseUrl, supabaseAnonKey)
	}
	return _supabase
})()

export const supabaseClient = supabase

/**
 * Anonymous Supabase client for public operations
 * Used for invitation acceptance and other public operations
 * Does not persist sessions
 */
export const supabaseAnon = (() => {
	if (_supabaseAnon) return _supabaseAnon
	if (supabaseUrl && supabaseAnonKey) {
		_supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
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
	}
	return _supabaseAnon
})() // Return null if env vars are missing