/**
 * Production Authentication Constants
 *
 * Minimal configuration for production authentication.
 * All authentication logic is handled by Supabase SSR.
 */

// Routes that require authentication
export const PROTECTED_ROUTE_PREFIXES = ['/dashboard'] as const

// Routes that should redirect to dashboard if already authenticated
export const PUBLIC_AUTH_ROUTES = [
	'/login',
	'/signup',
	'/auth/register'
] as const

export type ProtectedRoutePrefix = (typeof PROTECTED_ROUTE_PREFIXES)[number]
export type PublicAuthRoute = (typeof PUBLIC_AUTH_ROUTES)[number]
