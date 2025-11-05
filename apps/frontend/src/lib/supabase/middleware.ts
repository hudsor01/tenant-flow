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
import type { Database } from '@repo/shared/types/supabase-generated'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { decodeJwt } from 'jose'

const logger = createLogger({ component: 'SupabaseMiddleware' })

export async function updateSession(request: NextRequest) {
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

	// This will refresh the session if expired - required for Server Components
	// IMPORTANT: Use getUser() to validate the session with Supabase instead of just checking local storage
	let isAuthenticated = false
	let user: User | null = null
	try {
		const {
			data: { user: userData },
			error
		} = await supabase.auth.getUser()
		user = userData

		// Only consider user authenticated if getUser() succeeds (validates with Supabase)
		// Note: getSession() is redundant here as getUser() already validates the token
		isAuthenticated = !error && !!user
	} catch (err) {
		// Network failure or Supabase API error - fail closed for security
		logger.error('Auth check failed', {
			error: err instanceof Error ? err.message : String(err)
		})
		isAuthenticated = false
	}

	// Check route protection using centralized constants
	const pathname = request.nextUrl.pathname
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

	// PERFORMANCE OPTIMIZATION: Use JWT claims instead of database queries
	// Custom claims are added via Auth Hook (see migration: 20251031_auth_hook_custom_claims.sql)
	// This eliminates database calls on every request per Next.js middleware best practices
	// NOTE: Claims are in the JWT token, we need to decode it OR use user_metadata as fallback
	let userRole: string | null = null
	let subscriptionStatus: string | null = null
	let stripeCustomerId: string | null = null

	if (isAuthenticated && user) {
		const claims = await getJwtClaims(supabase)
		const roleFromClaims = getStringClaim(claims, 'user_role')
		const subscriptionFromClaims = getStringClaim(claims, 'subscription_status')
		const stripeIdFromClaims = getStringClaim(claims, 'stripe_customer_id')

		userRole = roleFromClaims ?? user.user_metadata?.role ?? null
		subscriptionStatus =
			subscriptionFromClaims ?? user.user_metadata?.subscription_status ?? null
		stripeCustomerId =
			stripeIdFromClaims ?? user.user_metadata?.stripe_customer_id ?? null
	}

	// Early redirect for authenticated users on marketing pages
	// Do this before payment gate to avoid showing pricing page to users who just need dashboard
	if (isAuthenticated && isMarketingRedirect && userRole) {
		const url = request.nextUrl.clone()
		const destination = userRole === 'TENANT' ? '/tenant' : '/manage'
		url.pathname = destination
		return NextResponse.redirect(url)
	}

	// Payment gate: Check if authenticated user has active subscription
	// Per Stripe best practices - check subscription_status field
	// Skip for payment-exempt routes (pricing, stripe checkout, etc.)
	if (isAuthenticated && !isPaymentExempt && userRole) {
		// TENANT role doesn't need payment (they're invited by OWNER)
		const requiresPayment = userRole !== 'TENANT'

		// Check subscription status per Stripe best practices
		// Valid statuses for access: active, trialing
		const validStatuses = ['active', 'trialing']
		const hasValidSubscription =
			subscriptionStatus && validStatuses.includes(subscriptionStatus)
		const hasNoStripeCustomer = !stripeCustomerId

		if (requiresPayment && (!hasValidSubscription || hasNoStripeCustomer)) {
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

		// Redirect based on role (from JWT claims)
		if (userRole === 'TENANT') {
			url.pathname = '/tenant'
		} else {
			// Default redirect to management dashboard for OWNER, MANAGER, ADMIN
			url.pathname = '/manage'
		}

		url.search = '' // Clear search params
		return NextResponse.redirect(url)
	}

	return supabaseResponse
}

async function getJwtClaims(
	supabase: SupabaseClient<Database>
): Promise<Record<string, unknown> | null> {
	try {
		const {
			data: { session },
			error
		} = await supabase.auth.getSession()

		if (error || !session?.access_token) {
			return null
		}

		// Use jose library for robust JWT decoding with proper error handling
		const payload = decodeJwt(session.access_token)
		return typeof payload === 'object' && payload !== null ? payload : null
	} catch (err) {
		logger.error('getJwtClaims failed while decoding session token', {
			error: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined
		})
		return null
	}
}

function getStringClaim(
	claims: Record<string, unknown> | null,
	key: string
): string | null {
	if (!claims) {
		return null
	}

	const value = claims[key]
	if (typeof value !== 'string') {
		return null
	}

	const normalized = value.trim()
	return normalized && normalized !== 'null' ? normalized : null
}
