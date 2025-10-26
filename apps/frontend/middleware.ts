import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
	let response = NextResponse.next({
		request: {
			headers: request.headers
		}
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
					cookiesToSet.forEach(({ name, value, options }) =>
						request.cookies.set(name, value)
					)
					response = NextResponse.next({
						request
					})
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options)
					)
				}
			}
		}
	)

	// SECURITY: Use getUser() NOT getSession() - getUser() validates token with Supabase servers
	// getSession() only reads from cookie without validation (security risk per Supabase docs 2025)
	const {
		data: { user }
	} = await supabase.auth.getUser()

	// Protect all routes under /(protected)
	if (request.nextUrl.pathname.startsWith('/manage') && !user) {
		// Redirect to login if not authenticated
		const redirectUrl = request.nextUrl.clone()
		redirectUrl.pathname = '/login'
		redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
		return NextResponse.redirect(redirectUrl)
	}

	// Protect tenant portal routes
	if (request.nextUrl.pathname.startsWith('/tenant') && !user) {
		const redirectUrl = request.nextUrl.clone()
		redirectUrl.pathname = '/login'
		redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
		return NextResponse.redirect(redirectUrl)
	}

	// Redirect authenticated users away from auth pages
	if (
		(request.nextUrl.pathname === '/login' ||
			request.nextUrl.pathname === '/signup') &&
		user
	) {
		return NextResponse.redirect(new URL('/manage', request.url))
	}

	return response
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
	]
}
