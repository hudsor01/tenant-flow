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
	// supabase.auth.getClaims(). A simple mistake could make it very hard to debug
	// issues with users being randomly logged out.

	// IMPORTANT: If you remove getClaims() and you use server-side rendering
	// with the Supabase client, your users may be randomly logged out.
	const { data } = await supabase.auth.getClaims()
	const user = data?.claims
	const pathname = request.nextUrl.pathname

	// Redirect authenticated users from marketing pages to their dashboard
	if (user && isMarketingRoute(pathname)) {
		const url = request.nextUrl.clone()
		const userType = (user as Record<string, unknown>).app_metadata as
			| { user_type?: string }
			| undefined
		url.pathname = userType?.user_type === 'TENANT' ? '/tenant' : '/dashboard'
		return NextResponse.redirect(url)
	}

	// Redirect unauthenticated users from protected routes to login
	// Skip static assets, marketing pages, and auth-related routes
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
