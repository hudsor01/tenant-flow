import { createClient } from '@supabase/supabase-js'

// Create a separate Supabase client for anonymous operations
// This client doesn't persist sessions and is used for public operations like invitation acceptance

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables')
}

// Create a client specifically for anonymous operations
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
