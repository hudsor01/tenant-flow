import {
	PROTECTED_ROUTE_PREFIXES,
	PUBLIC_AUTH_ROUTES
} from '@/lib/auth-constants'
import type { Database } from '@repo/shared/types/supabase-generated'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request
	})

	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

	// Redirect unauthenticated users from protected routes to login
	if (!isAuthenticated && isProtectedRoute) {
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		url.searchParams.set('redirectTo', pathname)
		return NextResponse.redirect(url)
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

		// Default redirect to dashboard if no valid redirectTo
		url.pathname = '/dashboard'
		url.search = '' // Clear search params
		return NextResponse.redirect(url)
	}

	return supabaseResponse
}
