import { logger } from '@/lib/logger'

interface SupabaseSession {
	user?: {
		id: string
		email?: string
	}
	expires_at?: number
}

interface SupabaseError {
	message?: string
	status?: number
	code?: string
}

// Production-safe debug logger that uses no-op functions in production
// This prevents any runtime errors and ensures zero performance impact
const isDebugEnabled =
	typeof process !== 'undefined' &&
	process.env?.NODE_ENV === 'development'

// No-op function for production
const noop = () => {
	/* no-op for production */
}

export const debugSupabaseAuth = {
	enabled: isDebugEnabled,

	log: isDebugEnabled
		? (message: string, data?: unknown) => {
				logger.info(`[Supabase Auth] ${message}`, data)
			}
		: noop,

	error: isDebugEnabled
		? (message: string, error?: unknown) => {
				logger.error(`[Supabase Auth Error] ${message}`, error)
			}
		: noop,

	warn: isDebugEnabled
		? (message: string, data?: unknown) => {
				logger.warn(`[Supabase Auth Warning] ${message}`, data)
			}
		: noop,

	info: isDebugEnabled
		? (message: string, data?: unknown) => {
				logger.info(`[Supabase Auth Info] ${message}`, { data })
			}
		: noop,

	// Helper to log session state
	logSession: isDebugEnabled
		? (session: SupabaseSession | null) => {
				logger.info('[Supabase Auth] Session State', {
					hasSession: !!session,
					userId: session?.user?.id,
					email: session?.user?.email,
					expiresAt: session?.expires_at
				})
			}
		: noop,

	// Helper to log auth errors
	logError: isDebugEnabled
		? (error: SupabaseError | unknown) => {
				const authError = error as SupabaseError
				logger.error('[Supabase Auth] Auth Error', {
					message: authError?.message,
					status: authError?.status,
					code: authError?.code,
					details: error
				})
			}
		: noop
}
