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
	const {
		data: { user }
	} = await supabase.auth.getUser()

	// Define protected routes and auth routes
	const pathname = request.nextUrl.pathname
	const isProtectedRoute = pathname.startsWith('/dashboard')
	const isAuthRoute =
		pathname === '/login' ||
		pathname === '/signup' ||
		pathname === '/auth/register'

	// Redirect unauthenticated users from protected routes to login
	if (!user && isProtectedRoute) {
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		url.searchParams.set('redirectTo', pathname)
		return NextResponse.redirect(url)
	}

	// Redirect authenticated users from auth routes to dashboard
	if (user && isAuthRoute) {
		const url = request.nextUrl.clone()
		url.pathname = '/dashboard'
		return NextResponse.redirect(url)
	}

	return supabaseResponse
}
