import { createClient } from '@supabase/supabase-js'
import { getRuntimeConfig } from '@repo/config'

const config = getRuntimeConfig()

/**
 * Shared Supabase browser client factory using runtime configuration.
 * This keeps API client creation consistent between apps.
 */
export function createSupabaseClient() {
	return createClient(config.supabaseUrl, config.supabaseAnonKey, {
		auth: {
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: true
		}
	})
}
