import { createClient } from '@supabase/supabase-js'

// Environment validation
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

// Debug logging for production environment issues
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
	console.warn('[Supabase Client] Environment check:', {
		hasUrl: !!supabaseUrl,
		hasKey: !!supabaseAnonKey,
		urlPrefix: supabaseUrl?.substring(0, 30),
		keyPrefix: supabaseAnonKey?.substring(0, 20),
		env: import.meta.env.MODE
	})
}

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('[Supabase Client] Missing environment variables:', {
		VITE_SUPABASE_URL: supabaseUrl || 'MISSING',
		VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'MISSING'
	})
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