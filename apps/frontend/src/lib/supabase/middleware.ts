import { SB_URL, SB_PUBLISHABLE_KEY, assertSupabaseConfig } from '@repo/shared/config/supabase'
import type { Database } from '@repo/shared/types/supabase'
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applySupabaseCookies } from '#lib/supabase/cookies'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'Middleware' })

/**
 * Minimal Session Sync (Next.js 16 + Supabase SSR)
 *
 * PHILOSOPHY: Keep proxy/middleware MINIMAL
 * - Session sync (required by Supabase)
 * - Simple route protection (existence checks only)
 * - Fast redirects for UX
 *
 * Complex auth logic belongs in:
 * - Server Components (page-level checks)
 * - DAL (data access authorization)
 * - Server Actions (mutation authorization)
 *
 * IMPORTANT: Do not add business logic here!
 */
export async function updateSession(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Create response that will be returned
	let response = NextResponse.next({ request })

	// Validate config before creating client
	assertSupabaseConfig()
	// Create Supabase client with cookie handling
	const supabase = createServerClient<Database>(
		SB_URL!, // Non-null: validated by assertSupabaseConfig()
		SB_PUBLISHABLE_KEY!, // Non-null: validated by assertSupabaseConfig()
		{
			cookies: {
				getAll() {
					return request.cookies.getAll()
				},
				setAll(cookiesToSet: CookieOptionsWithName[]) {
					// Apply cookies to request
					applySupabaseCookies(
						(name: string, value: string) => request.cookies.set(name, value),
						cookiesToSet
					)
					// Create fresh response with updated request
					response = NextResponse.next({ request })
					// Apply cookies to response
					applySupabaseCookies(
						(name: string, value: string, options?: Record<string, unknown>) =>
							options
								? response.cookies.set(name, value, options)
								: response.cookies.set(name, value),
						cookiesToSet
					)
				}
			}
		}
	)

	// REQUIRED: getClaims() prevents random logouts (Supabase SSR requirement)
	// Do not add code between createServerClient and getClaims!
	const { data } = await supabase.auth.getClaims()
	const hasSession = !!data?.claims?.sub

	// DEBUG: Log session state for testing
	if (!hasSession) {
		logger.debug('[NO_SESSION]', { pathname })
	}

	// Simple route checks (just prefix matching - fast!)
	const isProtected =
		pathname.startsWith('/manage') ||
		pathname.startsWith('/tenant') ||
		pathname.startsWith('/settings')
	const isAuthPage = pathname === '/login' || pathname.startsWith('/auth/')

	// Guard: Redirect unauthenticated users from protected routes
	if (!hasSession && isProtected) {
		logger.info('[REDIRECT_TO_LOGIN]', { pathname })
		const url = request.nextUrl.clone()
		url.pathname = '/login'
		url.searchParams.set('redirectTo', pathname)
		return NextResponse.redirect(url)
	}

	// Guard: Redirect authenticated users from auth pages
	if (hasSession && isAuthPage) {
		logger.info('[REDIRECT_TO_MANAGE]', { pathname })
		const url = request.nextUrl.clone()
		// Honor redirectTo if present and safe
		const redirectTo = url.searchParams.get('redirectTo')
		url.pathname =
			redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
				? redirectTo
				: '/manage'
		url.search = ''
		return NextResponse.redirect(url)
	}

	// Legacy redirect: /dashboard → /manage
	if (pathname.startsWith('/dashboard')) {
		logger.debug('[LEGACY_REDIRECT]', { from: pathname, to: pathname.replace('/dashboard', '/manage') })
		const url = request.nextUrl.clone()
		url.pathname = pathname.replace('/dashboard', '/manage')
		return NextResponse.redirect(url)
	}

	// All good - continue with synced session
	logger.debug('[SESSION_SYNCED]', { pathname, hasSession })
	return response
}
