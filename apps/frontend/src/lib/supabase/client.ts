import { createBrowserClient } from '@supabase/ssr'
<<<<<<< HEAD
import { logger } from '@/lib/logger/logger'
import { config } from '../config'
import type { Database } from '@repo/shared'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

// Use global variable to ensure single instance across all imports

type SupabaseClientType = ReturnType<typeof createBrowserClient<Database>>

declare global {
	var __supabaseClient: SupabaseClientType | null | undefined
}

let client: SupabaseClientType | null | undefined

export function createClient(): SupabaseClientType | null {
=======
import { logger } from '@/lib/logger'
import { config } from '../config'
import type { Database } from '@repo/shared/types/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

// Use global variable to ensure single instance across all imports
declare global {
	var __supabaseClient:
		| ReturnType<typeof createBrowserClient<Database>>
		| undefined
}

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
>>>>>>> origin/main
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
<<<<<<< HEAD
			// Return null to signal no client can be built in this environment
			return null
=======
			// Return a mock client that will be replaced at runtime
			return null as unknown as ReturnType<
				typeof createBrowserClient<Database>
			>
>>>>>>> origin/main
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
<<<<<<< HEAD
	let instance: SupabaseClientType | null | undefined
	return new Proxy({} as SupabaseClientType, {
		get(target, prop, receiver) {
			instance ??= createClient()
			return instance
				? Reflect.get(instance as object, prop, receiver)
				: undefined
=======
	let instance: ReturnType<typeof createClient> | undefined
	return new Proxy({} as ReturnType<typeof createClient>, {
		get(target, prop, receiver) {
			if (!instance) {
				instance = createClient()
			}
			return instance ? Reflect.get(instance, prop, receiver) : undefined
>>>>>>> origin/main
		}
	})
})()

// Export auth helpers - also lazy-initialized
<<<<<<< HEAD
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
=======
export const auth = new Proxy({} as typeof supabase.auth, {
	get(target, prop, receiver) {
		return Reflect.get(supabase.auth, prop, receiver)
>>>>>>> origin/main
	}
})

// Auth types are now in @repo/shared - use those instead

// Session management helpers with rate limiting
const authRequestTimestamps = new Map<string, number>()
const AUTH_RATE_LIMIT_MS = 2000

export async function getSession() {
	const key = 'getSession'
	const lastCall = authRequestTimestamps.get(key)
	const now = Date.now()

	if (lastCall && now - lastCall < AUTH_RATE_LIMIT_MS) {
		logger.warn(`[Auth] Rate limiting ${key} - too many requests`, {
			component: 'lib_supabase_client.ts'
		})
		const {
			data: { session }
		} = await supabase.auth.getSession()
		return { session, error: null }
	}

	authRequestTimestamps.set(key, now)
	const {
		data: { session },
		error
	} = await supabase.auth.getSession()
	return { session, error }
}

export async function getUser() {
	const key = 'getUser'
	const lastCall = authRequestTimestamps.get(key)
	const now = Date.now()

	if (lastCall && now - lastCall < AUTH_RATE_LIMIT_MS) {
		logger.warn(`[Auth] Rate limiting ${key} - too many requests`, {
			component: 'lib_supabase_client.ts'
		})
		const {
			data: { user }
		} = await supabase.auth.getUser()
		return { user, error: null }
	}

	authRequestTimestamps.set(key, now)
	const {
		data: { user },
		error
	} = await supabase.auth.getUser()
	return { user, error }
}

export function onAuthStateChange(
	callback: (event: AuthChangeEvent, session: Session | null) => void
) {
	return supabase.auth.onAuthStateChange(callback)
}
