import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Simple auth middleware for route protection
 */
export async function authMiddleware(request: NextRequest) {
	const response = NextResponse.next()
	const pathname = request.nextUrl.pathname

	// Public routes that don't need auth
	const publicRoutes = [
		'/',
		'/auth/login',
		'/auth/signup',
		'/auth/forgot-password',
		'/contact',
		'/pricing',
		'/features',
		'/about',
		'/security',
		'/terms-of-service',
		'/blog'
	]

	// Check if route is public
	const isPublicRoute = publicRoutes.some(route => 
		pathname === route || pathname.startsWith('/api/') || pathname.startsWith('/_next/')
	)

	if (isPublicRoute) {
		return response
	}

	// Check for auth on protected routes
	try {
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
			{
				cookies: {
					getAll: () => request.cookies.getAll(),
					setAll: () => {
						// Cookies are read-only in middleware
					}
				}
			}
		)

		const { data: { session } } = await supabase.auth.getSession()

		if (!session) {
			// Redirect to login for protected routes
			const loginUrl = new URL('/auth/login', request.url)
			loginUrl.searchParams.set('redirectTo', pathname)
			return NextResponse.redirect(loginUrl)
		}

		// Check admin routes
		if (pathname.startsWith('/admin')) {
			const { data: { user } } = await supabase.auth.getUser()
			const userRole = user?.user_metadata?.role

			if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
				return NextResponse.redirect(new URL('/unauthorized', request.url))
			}
		}

		return response
	} catch (error) {
		console.error('Auth middleware error:', error)
		// On error, redirect to login
		const loginUrl = new URL('/auth/login', request.url)
		loginUrl.searchParams.set('redirectTo', pathname)
		return NextResponse.redirect(loginUrl)
	}
}

// Routes that should be handled by this middleware
export const config = {
	matcher: [
		'/((?!api|_next/static|_next/image|favicon.ico|public).*)'
	]
}