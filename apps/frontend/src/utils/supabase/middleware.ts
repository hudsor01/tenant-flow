import {
	PROTECTED_ROUTE_PREFIXES,
	PUBLIC_AUTH_ROUTES
} from '@/lib/auth-constants'
import type { Database } from '@repo/shared'
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
	// IMPORTANT: Check session first to ensure it's valid, not just that a user exists
	const {
		data: { session }
	} = await supabase.auth.getSession()

	// Only consider user authenticated if there's a valid session
	const user = session?.user ?? null

	// Check route protection using centralized constants
	const pathname = request.nextUrl.pathname
	const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
		prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
	)
	const isAuthRoute = PUBLIC_AUTH_ROUTES.includes(
		pathname as (typeof PUBLIC_AUTH_ROUTES)[number]
	)

	// Redirect unauthenticated users from protected routes to login
	if (!user && isProtectedRoute) {
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		url.searchParams.set('redirectTo', pathname)
		return NextResponse.redirect(url)
	}

	// Redirect authenticated users from auth routes to dashboard
	// Only redirect if we have a valid session with a user
	if (user && session && isAuthRoute) {
		const url = request.nextUrl.clone()
		url.pathname = '/dashboard'
		return NextResponse.redirect(url)
	}

	return supabaseResponse
}
