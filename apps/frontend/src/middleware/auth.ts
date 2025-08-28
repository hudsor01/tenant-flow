import { type NextRequest, NextResponse } from 'next/server'

/**
 * Edge-compatible auth middleware for route protection
 * Note: We check for auth session cookies directly to avoid Edge Runtime incompatibility
 */
export function authMiddleware(request: NextRequest) {
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
	const isPublicRoute = publicRoutes.some(
		route =>
			pathname === route ||
			pathname.startsWith('/api/') ||
			pathname.startsWith('/_next/')
	)

	if (isPublicRoute) {
		return response
	}

	// Check for auth session cookie (Edge-compatible)
	const sessionCookie =
		request.cookies.get('sb-auth-token') ??
		request.cookies.get(
			`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0]}-auth-token`
		)

	if (!sessionCookie) {
		// Redirect to login for protected routes
		const loginUrl = new URL('/auth/login', request.url)
		loginUrl.searchParams.set('redirectTo', pathname)
		return NextResponse.redirect(loginUrl)
	}

	// For admin routes, we'll check permissions in the page component
	// since we can't use Supabase client in Edge Runtime
	// Admin permission check will be done client-side or in Server Components

	return response
}

// Routes that should be handled by this middleware
export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)']
}
