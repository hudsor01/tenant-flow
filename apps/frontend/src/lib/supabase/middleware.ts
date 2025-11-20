import {
	MARKETING_REDIRECT_ROUTES,
	PAYMENT_EXEMPT_ROUTES,
	PROTECTED_ROUTE_PREFIXES,
	PUBLIC_AUTH_ROUTES
} from '#lib/auth-constants'
import {
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
} from '@repo/shared/config/supabase'
import type { Database } from '@repo/shared/types/supabase'
import type { User } from '@supabase/supabase-js'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const logger = createLogger({ component: 'AuthMiddleware' })

/**
 * Session Update & Auth Validation
 *
 * Called by: src/middleware.ts (Next.js entry point)
 *
 * Responsibilities:
 * 1. Extract and validate session from cookies (Supabase SSR)
 * 2. Verify JWT signature against Supabase public keys
 * 3. Extract auth claims (user_type, stripe_customer_id)
 * 4. Enforce route protection (protected routes → /login)
 * 5. Implement payment gating (non-paying users → /pricing)
 * 6. Handle user-type redirects (TENANT → /tenant, others → /manage)
 *
 * Returns: NextResponse with appropriate redirect or pass-through
 */
export async function updateSession(request: NextRequest) {
	const pathname = request.nextUrl.pathname
	logger.info('[SESSION_UPDATE_START]', { pathname })

	let supabaseResponse = NextResponse.next({
		request
	})

	const supabase = createServerClient<Database>(
		SUPABASE_URL,
		SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll()
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value)
					)
					supabaseResponse = NextResponse.next({
						request
					})
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options)
					)
				}
			}
		}
	)

	// SECURITY FIX: Use getUser() for server-side JWT validation
	// Performance: ~200-500ms (API roundtrip) but reliable
	// Security: Supabase handles JWT verification server-side
	let isAuthenticated = false
	let user: User | null = null

	try {
		// Get user from Supabase (server-side validation)
		const {
			data: { user: authUser },
			error: userError
		} = await supabase.auth.getUser()

		logger.info('[SESSION_CHECK]', {
			pathname,
			hasUser: !!authUser,
			error: userError?.message
		})

		if (userError || !authUser) {
			isAuthenticated = false
			logger.info('[NO_SESSION]', { pathname })
		} else {
			user = authUser
			isAuthenticated = true
			logger.info('[USER_VERIFIED]', {
				pathname,
				userId: user.id,
				email: user.email
			})
		}
	} catch (err) {
		// Auth check failed
		logger.error('Auth check failed', {
			error: err instanceof Error ? err.message : String(err)
		})
		isAuthenticated = false
	}

	// Check route protection using centralized constants
	const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
		prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
	)
	const isAuthRoute = PUBLIC_AUTH_ROUTES.includes(
		pathname as (typeof PUBLIC_AUTH_ROUTES)[number]
	)
	const isPaymentExempt = PAYMENT_EXEMPT_ROUTES.some(
		route => pathname === route || pathname.startsWith(route)
	)

	// Redirect unauthenticated users from protected routes to login
	if (!isAuthenticated && isProtectedRoute) {
		logger.info('[REDIRECT_TO_LOGIN]', {
			fromPath: pathname,
			reason: 'not_authenticated',
			isProtected: true
		})
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		url.searchParams.set('redirectTo', pathname)
		return NextResponse.redirect(url)
	}

	// Redirect authenticated users from marketing pages to their dashboard
	// Marketing pages show "Get Started" CTAs which don't make sense for logged-in users
	const isMarketingRedirect = MARKETING_REDIRECT_ROUTES.includes(
		pathname as (typeof MARKETING_REDIRECT_ROUTES)[number]
	)

	// PERFORMANCE OPTIMIZATION: Use user metadata instead of database queries
	// Custom claims are added via Auth Hook (see migration: 20251116_fix_auth_hook_for_current_schema.sql)
	// This eliminates database calls on every request per Next.js middleware best practices
	let user_type: string | null = null
	let stripe_customer_id: string | null = null

	if (isAuthenticated && user) {
		user_type = user.user_metadata?.user_type ?? null
		stripe_customer_id = user.user_metadata?.stripe_customer_id ?? null
	}

	// Early redirect for authenticated users on marketing pages
	// Do this before payment gate to avoid showing pricing page to users who just need dashboard
	if (isAuthenticated && isMarketingRedirect && user_type) {
		logger.info('[REDIRECT_MARKETING_PAGE]', {
			fromPath: pathname,
			toPath: user_type === 'TENANT' ? '/tenant' : '/manage',
			userType: user_type
		})
		const url = request.nextUrl.clone()
		const destination = user_type === 'TENANT' ? '/tenant' : '/manage'
		url.pathname = destination
		return NextResponse.redirect(url)
	}

	// Payment gate: Check if authenticated user has Stripe customer ID
	// TENANT user_type doesn't need payment (they're invited by OWNER)
	// Skip for payment-exempt routes (pricing, stripe checkout, etc.)
	if (isAuthenticated && !isPaymentExempt && user_type && user_type !== 'TENANT') {
		// For now, redirect to pricing if no Stripe customer ID
		// (subscription status will be checked via Stripe API when needed)
		if (!stripe_customer_id) {
			const url = request.nextUrl.clone()
			url.pathname = '/pricing'
			url.searchParams.set('required', 'true')
			url.searchParams.set('redirectTo', pathname)
			return NextResponse.redirect(url)
		}
	}

	// Redirect authenticated users from auth routes to dashboard or intended destination
	// Only redirect if authentication is valid (validated with Supabase)
	if (isAuthenticated && isAuthRoute) {
		const url = request.nextUrl.clone()

		// Check if there's a redirectTo parameter - if so, use it instead of default dashboard
		const redirectTo = request.nextUrl.searchParams.get('redirectTo')
		if (redirectTo && redirectTo !== pathname) {
			// Validate the redirect path is internal and safe
			if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
				url.pathname = redirectTo
				url.search = '' // Clear search params
				return NextResponse.redirect(url)
			}
		}

		// Redirect based on user_type (from JWT claims)
		if (user_type === 'TENANT') {
			url.pathname = '/tenant'
		} else {
			// Default redirect to management dashboard for OWNER, MANAGER, ADMIN
			url.pathname = '/manage'
		}

		url.search = '' // Clear search params
		return NextResponse.redirect(url)
	}

	// Redirect /dashboard and /dashboard/* to /manage and /manage/*
	if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
		const url = request.nextUrl.clone()
		url.pathname = pathname.replace('/dashboard', '/manage')
		return NextResponse.redirect(url)
	}

	return supabaseResponse
}
