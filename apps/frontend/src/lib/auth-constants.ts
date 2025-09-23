/**
 * Shared Authentication Constants
 *
 * Centralized auth patterns to avoid duplication between middleware and auth providers.
 * These patterns are used for Supabase session detection across the application.
 */

export const SUPABASE_AUTH_COOKIE_CANDIDATES = [
	'sb-access-token',
	'supabase-auth-token',
	'supabase.auth.token'
] as const

export const MOCK_AUTH_COOKIE_PATTERNS = ['mock-user-id'] as const

export const ALL_AUTH_COOKIE_PATTERNS = [
	...SUPABASE_AUTH_COOKIE_CANDIDATES,
	...MOCK_AUTH_COOKIE_PATTERNS
] as const

export const PUBLIC_AUTH_ROUTES = [
	'/auth/register',
	'/login',
	'/signup'
] as const

export const PROTECTED_ROUTE_PREFIXES = ['/dashboard'] as const

export type AuthCookiePattern = (typeof ALL_AUTH_COOKIE_PATTERNS)[number]
export type PublicAuthRoute = (typeof PUBLIC_AUTH_ROUTES)[number]
export type ProtectedRoutePrefix = (typeof PROTECTED_ROUTE_PREFIXES)[number]
