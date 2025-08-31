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
	// Temporarily disable Supabase for UI showcase
	if (process.env.NODE_ENV === 'development') {
		logger.info('[Supabase] Temporarily disabled for UI showcase')
		return null
	}
	
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
			},
			realtime: {
				params: {
					eventsPerSecond: 10,
				},
			},
			global: {
				headers: {
					'X-Client-Info': 'supabase-js-web',
				},
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

// Generic rate-limited auth method wrapper using native patterns
async function withAuthRateLimit<T>(
	key: string, 
	authCall: () => Promise<T>
): Promise<T> {
	const lastCall = authRequestTimestamps.get(key)
	const now = Date.now()

	if (lastCall && now - lastCall < AUTH_RATE_LIMIT_MS) {
		logger.warn(`[Auth] Rate limiting ${key} - too many requests`, {
			component: 'lib_supabase_client.ts'
		})
		return authCall()
	}

	authRequestTimestamps.set(key, now)
	return authCall()
}

export async function getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
	const result = await withAuthRateLimit('getSession', () => supabase.auth.getSession())
	return { session: result.data.session ?? null, error: result.error }
}

export async function getUser(): Promise<{ user: User | null; error: AuthError | null }> {
	const result = await withAuthRateLimit('getUser', () => supabase.auth.getUser())
	return { user: result.data.user ?? null, error: result.error }
}

export function onAuthStateChange(
	callback: (event: AuthChangeEvent, session: Session | null) => void
) {
	return supabase.auth.onAuthStateChange(callback)
}
