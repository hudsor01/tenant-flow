/**
 * Production Authentication Constants
 *
 * Minimal configuration for production authentication.
 * All authentication logic is handled by Supabase SSR.
 */

// Routes that require authentication
export const PROTECTED_ROUTE_PREFIXES = [
	'/manage',
	'/tenant',
	'/settings'
] as const

// Routes that should redirect to management dashboard if already authenticated
export const PUBLIC_AUTH_ROUTES = [
	'/login',
	'/auth/register'
] as const

// Marketing routes that should redirect authenticated users to their dashboard
// These pages show "Get Started" CTAs which don't make sense for logged-in users
export const MARKETING_REDIRECT_ROUTES = [
	'/',
	'/features',
	'/about'
] as const

// Routes that don't require payment (public pages + payment flow itself)
export const PAYMENT_EXEMPT_ROUTES = [
	'/login',
	'/pricing',
	'/auth',
	'/stripe',
	'/',
	'/help',
	'/privacy',
	'/terms'
] as const

export type ProtectedRoutePrefix = (typeof PROTECTED_ROUTE_PREFIXES)[number]
export type PublicAuthRoute = (typeof PUBLIC_AUTH_ROUTES)[number]
export type MarketingRedirectRoute = (typeof MARKETING_REDIRECT_ROUTES)[number]
