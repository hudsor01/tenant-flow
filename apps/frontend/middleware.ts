/**
 * Next.js Middleware for Supabase Auth Session Refresh
 *
 * This middleware refreshes the Supabase auth session on every request.
 * CRITICAL: Uses getAll/setAll cookie pattern as required by @supabase/ssr.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@repo/shared/types/supabase'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
	'/',
	'/login',
	'/signup',
	'/pricing',
	'/about',
	'/contact',
	'/features',
	'/blog',
	'/faq',
	'/help',
	'/resources',
	'/privacy',
	'/terms',
	'/search',
	'/auth/callback',
	'/auth/confirm-email',
	'/auth/update-password',
	'/accept-invite'
]

// Routes that should redirect authenticated users away
const AUTH_ROUTES = ['/login', '/signup']

export async function middleware(request: NextRequest) {
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
					cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

	// IMPORTANT: Do not run code between createServerClient and
	// supabase.auth.getUser(). A simple mistake could make it very hard to debug
	// issues with users being randomly logged out.

	// IMPORTANT: DO NOT REMOVE auth.getUser()
	// This call refreshes the session and prevents random logouts
	const {
		data: { user }
	} = await supabase.auth.getUser()

	const { pathname } = request.nextUrl

	// Check if current path is public
	const isPublicRoute = PUBLIC_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	)

	// Check if current path is an auth route (login/signup)
	const isAuthRoute = AUTH_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	)

	// If user is logged in and trying to access auth routes, redirect to dashboard
	if (user && isAuthRoute) {
		const userType = user.app_metadata?.user_type as string | undefined
		const destination = userType === 'TENANT' ? '/tenant' : '/dashboard'
		const url = request.nextUrl.clone()
		url.pathname = destination
		return NextResponse.redirect(url)
	}

	// If user is not logged in and trying to access protected routes
	if (!user && !isPublicRoute) {
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		// Preserve the intended destination for post-login redirect
		url.searchParams.set('redirect', pathname)
		return NextResponse.redirect(url)
	}

	// IMPORTANT: You *must* return the supabaseResponse object as it is.
	// If you're creating a new response object with NextResponse.next() make sure to:
	// 1. Pass the request in it, like so:
	//    const myNewResponse = NextResponse.next({ request })
	// 2. Copy over the cookies, like so:
	//    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
	// 3. Change the myNewResponse object to fit your needs, but avoid changing
	//    the cookies!
	// 4. Finally:
	//    return myNewResponse
	// If this is not done, you may be causing the browser and server to go out
	// of sync and terminate the user's session prematurely!

	return supabaseResponse
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public assets (images, fonts, etc.)
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)'
	]
}
