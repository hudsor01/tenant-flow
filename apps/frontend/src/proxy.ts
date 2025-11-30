/**
 * Proxy - Next.js 16 Pattern
 *
 * Handles authentication and routing before requests are processed.
 * This is the ONLY place where auth enforcement happens.
 *
 * Architecture:
 * - Proxy: HTTP-level auth enforcement (this file)
 * - DAL: Data access only (no redirects)
 * - Layouts: Just UI (no auth checks)
 * - RLS: Database-level security
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'

/**
 * JWT Claims interface from Supabase
 */
interface JWTClaims {
	sub: string
	email?: string
	app_metadata?: Record<string, unknown>
	user_metadata?: Record<string, unknown>
	[key: string]: unknown
}

/**
 * Route Configuration
 *
 * PROTECTED_OWNER: Requires OWNER role
 * PROTECTED_TENANT: Requires TENANT role
 */
const protectedOwnerRoutes = [
	'/dashboard',
	'/analytics',
	'/properties',
	'/units',
	'/tenants',
	'/leases',
	'/maintenance',
	'/documents',
	'/financials',
	'/payments',
	'/reports',
	'/rent-collection'
]

const protectedTenantRoutes = ['/tenant']

/**
 * Check if path matches a protected route
 *
 * Uses boundary-aware matching to prevent false positives:
 * - '/tenant' should match '/tenant' and '/tenant/settings'
 * - '/tenant' should NOT match '/tenants' (different route)
 */
function matchesProtectedRoute(path: string, routes: string[]): boolean {
	return routes.some((route) => {
		// Exact match
		if (path === route) return true
		// Starts with route followed by '/' (sub-route)
		if (path.startsWith(route + '/')) return true
		return false
	})
}

export async function proxy(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request
	})

	// Validate Supabase config
	if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
		// Missing configuration - return response without auth check
		return supabaseResponse
	}

	// Create Supabase client with cookie handling for token refresh
	const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return request.cookies.getAll()
			},
			setAll(cookiesToSet) {
				// Update request cookies
				cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

				// Create new response with updated cookies
				supabaseResponse = NextResponse.next({
					request
				})

				// Set cookies on response
				cookiesToSet.forEach(({ name, value, options }) =>
					supabaseResponse.cookies.set(name, value, options)
				)
			}
		}
	})

	/**
	 * CRITICAL SECURITY: Use getClaims() not getUser()
	 *
	 * Per Supabase docs: "Always use getClaims() to protect pages and user data.
	 * Never trust getSession() inside server code such as proxy."
	 *
	 * getClaims() validates JWT signatures on every call and is more performant
	 * than getUser() since it doesn't fetch the full user object.
	 *
	 * This call is required for Supabase SSR token refresh.
	 */
	const claimsResult = await supabase.auth.getClaims()
	const claims = claimsResult.data?.claims as JWTClaims | null

	const path = request.nextUrl.pathname

	// Use boundary-aware matching to prevent /tenants from matching /tenant
	const isOwnerRoute = matchesProtectedRoute(path, protectedOwnerRoutes)
	const isTenantRoute = matchesProtectedRoute(path, protectedTenantRoutes)

	/**
	 * Redirect Logic
	 *
	 * 1. No claims + protected route → /login
	 * 2. Has claims + /login → appropriate dashboard
	 * 3. Wrong role for route → correct dashboard
	 */

	// Redirect unauthenticated users from protected routes to login
	// claims will be null if JWT is invalid/expired
	if (!claims && (isOwnerRoute || isTenantRoute)) {
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		url.searchParams.set('redirect', path)
		return NextResponse.redirect(url)
	}

	// Redirect authenticated users away from login page
	if (claims && path === '/login') {
		const url = request.nextUrl.clone()
		// Get user_type from claims (set by custom access token hook)
		const userType = (claims.app_metadata as { user_type?: string })?.user_type
		url.pathname = userType === 'OWNER' ? '/dashboard' : '/tenant'
		return NextResponse.redirect(url)
	}

	// Role-based route protection
	if (claims) {
		const userType = (claims.app_metadata as { user_type?: string })?.user_type

		// OWNER trying to access tenant routes
		if (userType === 'OWNER' && isTenantRoute) {
			const url = request.nextUrl.clone()
			url.pathname = '/dashboard'
			return NextResponse.redirect(url)
		}

		// TENANT trying to access owner routes
		if (userType === 'TENANT' && isOwnerRoute) {
			const url = request.nextUrl.clone()
			url.pathname = '/tenant'
			return NextResponse.redirect(url)
		}
	}

	// Add pathname to headers for layouts (for redirectTo parameter)
	supabaseResponse.headers.set('x-pathname', path)

/**
 * IMPORTANT: Return supabaseResponse
 *
 * This response contains updated session cookies from Supabase.
 * Returning a different response will break session management.
 */
return supabaseResponse
}

/**
 * Matcher Configuration
 *
 * Proxy runs on all routes EXCEPT:
 * - _next/static (static files)
 * - _next/image (image optimization)
 * - favicon.ico
 * - static (static assets)
 * - public (public assets)
 * - assets (asset files)
 * - api (API routes are handled separately)
 * - auth (auth routes handled by auth provider)
 * - stripe (stripe webhooks handled separately)
 * - sw.js (service worker)
 * - manifest.json (PWA manifest)
 * - .well-known (security files)
 *
 * This ensures session refresh happens only on routes that need auth/session handling.
 */
export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|static|public|assets|api|auth|stripe|sw.js|manifest.json|\\.well-known).*)'
	]
}
