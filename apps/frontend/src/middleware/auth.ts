import { type NextRequest, NextResponse } from 'next/server'
<<<<<<< HEAD

/**
 * Edge-compatible auth middleware for route protection
 * Note: We check for auth session cookies directly to avoid Edge Runtime incompatibility
 */
export function authMiddleware(request: NextRequest) {
=======
import { createServerClient } from '@supabase/ssr'

/**
 * Simple auth middleware for route protection
 */
export async function authMiddleware(request: NextRequest) {
>>>>>>> origin/main
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
<<<<<<< HEAD
	const isPublicRoute = publicRoutes.some(
		route =>
			pathname === route ||
			pathname.startsWith('/api/') ||
			pathname.startsWith('/_next/')
=======
	const isPublicRoute = publicRoutes.some(route => 
		pathname === route || pathname.startsWith('/api/') || pathname.startsWith('/_next/')
>>>>>>> origin/main
	)

	if (isPublicRoute) {
		return response
	}

<<<<<<< HEAD
	// Check for auth session cookie (Edge-compatible)
	const sessionCookie =
		request.cookies.get('sb-auth-token') ??
		request.cookies.get(
			`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0]}-auth-token`
		)

	if (!sessionCookie) {
		// Redirect to login for protected routes
=======
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
>>>>>>> origin/main
		const loginUrl = new URL('/auth/login', request.url)
		loginUrl.searchParams.set('redirectTo', pathname)
		return NextResponse.redirect(loginUrl)
	}
<<<<<<< HEAD

	// For admin routes, we'll check permissions in the page component
	// since we can't use Supabase client in Edge Runtime
	// Admin permission check will be done client-side or in Server Components

	return response
=======
>>>>>>> origin/main
}

// Routes that should be handled by this middleware
export const config = {
<<<<<<< HEAD
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)']
}
=======
	matcher: [
		'/((?!api|_next/static|_next/image|favicon.ico|public).*)'
	]
}
>>>>>>> origin/main
