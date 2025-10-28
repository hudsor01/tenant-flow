import {
	PAYMENT_EXEMPT_ROUTES,
	PROTECTED_ROUTE_PREFIXES,
	PUBLIC_AUTH_ROUTES
} from '#lib/auth-constants'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { Database } from '@repo/shared/types/supabase-generated'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request
	})

	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
	const {
		data: { user },
		error
	} = await supabase.auth.getUser()

	// Get session info for expiration checks
	const {
		data: { session }
	} = await supabase.auth.getSession()

	// Only consider user authenticated if getUser() succeeds (validates with Supabase)
	const isAuthenticated = !error && user && session

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

	// PERFORMANCE FIX: Fetch user profile once instead of twice
	// Prevents infinite loop from repeated DB calls on every request
	let userProfile: { subscription_status: string | null; stripeCustomerId: string | null; role: string } | null = null

	if (isAuthenticated && user) {
		try {
			const { data } = await supabase
				.from('users')
				.select('subscription_status, stripeCustomerId, role')
				.eq('supabaseId', user.id)
				.single()
			userProfile = data
		} catch (error) {
			// Log error but continue - fail open for better UX
			logger.error('Failed to fetch user profile', {
				action: 'middleware_user_profile_fetch_failed',
				metadata: {
					error: error instanceof Error ? error.message : String(error)
				}
			})
		}
	}

	// Payment gate: Check if authenticated user has active subscription
	// Per Stripe best practices - check subscription_status field
	// Skip for payment-exempt routes (pricing, stripe checkout, etc.)
	if (isAuthenticated && !isPaymentExempt && userProfile) {
		// TENANT role doesn't need payment (they're invited by OWNER)
		const requiresPayment = userProfile.role !== 'TENANT'

		// Check subscription status per Stripe best practices
		// Valid statuses for access: active, trialing
		const validStatuses = ['active', 'trialing']
		const hasValidSubscription =
			userProfile.subscription_status &&
			validStatuses.includes(userProfile.subscription_status)
		const hasNoStripeCustomer = !userProfile.stripeCustomerId

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

		// Redirect based on role (already fetched above)
		if (userProfile?.role === 'TENANT') {
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
