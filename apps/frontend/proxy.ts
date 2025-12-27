/**
 * Next.js Middleware - Supabase Auth SSR Token Refresh
 *
 * CRITICAL: This middleware uses the CORRECT getAll/setAll cookie pattern
 * as specified in the Supabase SSR documentation.
 *
 * DO NOT modify to use individual get/set/remove methods - they are DEPRECATED
 * and will break authentication in production.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request
	})

	const supabase = createServerClient(
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

	// Do not run code between createServerClient and
	// supabase.auth.getUser(). A simple mistake could make it very hard to debug
	// issues with users being randomly logged out.

	// IMPORTANT: DO NOT REMOVE auth.getUser()
	const {
		data: { user }
	} = await supabase.auth.getUser()

	// Define protected route patterns
	const protectedPaths = [
		'/dashboard',
		'/properties',
		'/tenants',
		'/leases',
		'/payments',
		'/maintenance',
		'/financials',
		'/settings',
		'/profile'
	]

	const isProtectedPath = protectedPaths.some(
		path =>
			request.nextUrl.pathname.startsWith(path) ||
			request.nextUrl.pathname.startsWith(`/(owner)${path}`) ||
			request.nextUrl.pathname.startsWith(`/(tenant)${path}`)
	)

	// Redirect unauthenticated users trying to access protected routes
	if (!user && isProtectedPath) {
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		url.searchParams.set('redirectTo', request.nextUrl.pathname)
		return NextResponse.redirect(url)
	}

	// Redirect authenticated users away from auth pages
	const authPaths = ['/login', '/signup', '/auth']
	const isAuthPath = authPaths.some(path =>
		request.nextUrl.pathname.startsWith(path)
	)

	if (user && isAuthPath) {
		const redirectTo = request.nextUrl.searchParams.get('redirectTo')
		const url = request.nextUrl.clone()
		url.pathname = redirectTo || '/dashboard'
		url.searchParams.delete('redirectTo')
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
		 * - api/webhooks (webhook endpoints that don't need auth)
		 * Feel free to modify this pattern to include more paths.
		 */
		'/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'
	]
}
