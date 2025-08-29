import { createBrowserClient } from '@supabase/ssr'
import { logger } from '@/lib/logger/logger'
import { config } from '../config'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { AuthChangeEvent, Session, User, AuthError } from '@supabase/supabase-js'

// Use global variable to ensure single instance across all imports

type SupabaseClientType = ReturnType<typeof createBrowserClient<Database>>

declare global {
	var __supabaseClient: SupabaseClientType | null | undefined
}

let client: SupabaseClientType | null | undefined

export function createClient(): SupabaseClientType | null {
	// Check for global instance first to prevent multiple instances
	if (typeof window !== 'undefined' && globalThis.__supabaseClient) {
		return globalThis.__supabaseClient
	}

	// Create a single instance for client-side
	if (!client) {
		// Check if environment variables are available
		const url = config.supabase.url
		const anonKey = config.supabase.anonKey

		// During build time, these might be empty - that's OK for static generation
		if (!url || !anonKey) {
			logger.warn(
				'[Supabase] Missing environment variables - client initialization skipped',
				{
					component: 'lib_supabase_client.ts'
				}
			)
			// Return null to signal no client can be built in this environment
			return null
		}

		client = createBrowserClient<Database>(url, anonKey, {
			auth: {
				autoRefreshToken: true,
				persistSession: true,
				detectSessionInUrl: true,
				flowType: 'pkce',
				storageKey: 'tf-auth-v2',
				debug: process.env.NODE_ENV === 'development'
			}
		})

		// Store in global for reuse
		if (typeof window !== 'undefined') {
			globalThis.__supabaseClient = client
		}
	}

	return client
}

// Export a lazy-initialized singleton for backward compatibility
// This will only initialize when actually used, not at module load time
export const supabase = (() => {
	let instance: SupabaseClientType | null | undefined
	return new Proxy({} as SupabaseClientType, {
		get(target, prop, receiver) {
			instance ??= createClient()
			return instance
				? Reflect.get(instance as object, prop, receiver)
				: undefined
		}
	})
})()

// Export auth helpers - also lazy-initialized
export const auth = new Proxy({} as object, {
	get(target, prop, receiver) {
		try {
			// Accessing `supabase.auth` may return undefined when instance is not available
			const candidate = supabase
			if (!candidate || typeof candidate !== 'object') return undefined
			const authTarget = (candidate as { auth?: unknown }).auth
			return authTarget
				? Reflect.get(authTarget as object, prop, receiver)
				: undefined
		} catch {
			return undefined
		}
	}
})

// Auth types are now in @repo/shared - use those instead

// Session management helpers with rate limiting
const authRequestTimestamps = new Map<string, number>()
const AUTH_RATE_LIMIT_MS = 2000

// Session helper with rate limiting
async function _getSessionWithRateLimit(): Promise<{ session: Session | null; error: AuthError | null }> {
	const lastCall = authRequestTimestamps.get('getSession')
	const now = Date.now()

	if (lastCall && now - lastCall < AUTH_RATE_LIMIT_MS) {
		logger.warn(`[Auth] Rate limiting getSession - too many requests`, {
			component: 'lib_supabase_client.ts'
		})
		const result = await supabase.auth.getSession()
		return { session: result.data.session ?? null, error: null }
	}

	authRequestTimestamps.set('getSession', now)
	const result = await supabase.auth.getSession()
	return { session: result.data.session ?? null, error: result.error }
}

// User helper with rate limiting  
async function _getUserWithRateLimit(): Promise<{ user: User | null; error: AuthError | null }> {
	const lastCall = authRequestTimestamps.get('getUser')
	const now = Date.now()

	if (lastCall && now - lastCall < AUTH_RATE_LIMIT_MS) {
		logger.warn(`[Auth] Rate limiting getUser - too many requests`, {
			component: 'lib_supabase_client.ts'
		})
		const result = await supabase.auth.getUser()
		return { user: result.data.user ?? null, error: null }
	}

	authRequestTimestamps.set('getUser', now)
	const result = await supabase.auth.getUser()
	return { user: result.data.user ?? null, error: result.error }
}

export async function getSession() {
	return _getSessionWithRateLimit()
}

export async function getUser() {
	return _getUserWithRateLimit()
}

export function onAuthStateChange(
	callback: (event: AuthChangeEvent, session: Session | null) => void
) {
	return supabase.auth.onAuthStateChange(callback)
}
