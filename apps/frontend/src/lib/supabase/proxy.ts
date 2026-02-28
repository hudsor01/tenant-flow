import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '#env'
import { hasEnvVars } from '../utils'

// Marketing/public pages that authenticated users should be redirected away from
const MARKETING_ROUTES = new Set([
	'/',
	'/about',
	'/blog',
	'/contact',
	'/faq',
	'/features',
	'/help',
	'/pricing',
	'/privacy',
	'/resources',
	'/search',
	'/terms'
])

// Static assets that should never trigger auth redirects
// These files are served from /public and must be accessible without authentication
const STATIC_ASSET_PATTERNS = [
	'/manifest.json',
	'/sw.js',
	'/robots.txt',
	'/sitemap.xml',
	'/sitemap-index.xml',
	'/structured-data.json',
	'/browserconfig.xml',
	'/.well-known/',
	'/_redirects'
]

/**
 * Check if a pathname is a static asset that should bypass auth
 */
function isStaticAsset(pathname: string): boolean {
	return STATIC_ASSET_PATTERNS.some(pattern => pathname.startsWith(pattern))
}

function isMarketingRoute(pathname: string): boolean {
	// Check exact match first
	if (MARKETING_ROUTES.has(pathname)) return true
	// Check if it's a sub-route of marketing pages (e.g., /blog/post-slug)
	const basePath = '/' + pathname.split('/')[1]
	return MARKETING_ROUTES.has(basePath)
}

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request
	})

	// If the env vars are not set, skip proxy check. You can remove this
	// once you setup the project.
	if (!hasEnvVars) {
		return supabaseResponse
	}

	const pathname = request.nextUrl.pathname

	// Fast path: if no Supabase session cookie exists, there is no authenticated
	// user. Skip the getUser() network round-trip (~400ms) entirely.
	// Security: an attacker cannot forge a server-side session without the cookie.
	// getUser() is still called whenever a session cookie is present (below).
	const hasSessionCookie = request.cookies.getAll().some(({ name }) =>
		name.startsWith('sb-') && name.endsWith('-auth-token')
	)

	if (!hasSessionCookie) {
		// No cookie → definitely not authenticated
		if (
			!isStaticAsset(pathname) &&
			!isMarketingRoute(pathname) &&
			!pathname.startsWith('/login') &&
			!pathname.startsWith('/auth') &&
			!pathname.startsWith('/accept-invite')
		) {
			const url = request.nextUrl.clone()
			url.pathname = '/login'
			return NextResponse.redirect(url)
		}
		// Marketing/auth routes — pass through with zero network calls
		return supabaseResponse
	}

	// Cookie present — validate the session with Supabase Auth server.
	// With Fluid compute, don't put this client in a global environment
	// variable. Always create a new one on each request.
	const supabase = createServerClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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

	// IMPORTANT: Use getUser() to validate the session with Supabase Auth server
	// getClaims() only reads JWT locally without server validation
	const { data: { user } } = await supabase.auth.getUser()

	// Redirect authenticated users based on their role
	if (user) {
		const userType = user.app_metadata?.user_type as string | undefined

		// PENDING users must complete role selection before accessing any dashboard
		// Allow them to stay on /auth/select-role and other /auth/ pages
		if (userType === 'PENDING' && !pathname.startsWith('/auth')) {
			const url = request.nextUrl.clone()
			url.pathname = '/auth/select-role'
			return NextResponse.redirect(url)
		}

		// Redirect authenticated users from marketing pages and login to their dashboard
		if (isMarketingRoute(pathname) || pathname.startsWith('/login')) {
			const url = request.nextUrl.clone()
			if (userType === 'PENDING') {
				url.pathname = '/auth/select-role'
			} else {
				url.pathname = userType === 'TENANT' ? '/tenant' : '/dashboard'
			}
			return NextResponse.redirect(url)
		}
	}

	// Redirect unauthenticated users from protected routes to login
	// (session cookie was present but getUser() returned no user — expired/invalid)
	if (
		!user &&
		!isStaticAsset(pathname) &&
		!isMarketingRoute(pathname) &&
		!pathname.startsWith('/login') &&
		!pathname.startsWith('/auth') &&
		!pathname.startsWith('/accept-invite')
	) {
		const url = request.nextUrl.clone()
		url.pathname = '/login'
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
