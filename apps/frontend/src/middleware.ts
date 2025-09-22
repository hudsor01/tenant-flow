import { getCSPString, type ThemeMode } from '@repo/shared'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Tailwind v4 + Design-System Aware Middleware
 * --------------------------------------------
 * - Mirrors token architecture defined in `globals.css`
 * - Ensures CSP/security headers are sourced from shared config
 * - Normalises Supabase auth cookies and public/protected routes
 * - Surfaces preferred theme so CSS custom properties resolve correctly
 */

const STATIC_ROUTE_PREFIXES = [
	'/assets',
	'/public',
	'/.well-known',
	'/_next',
	'/api'
] as const
const PUBLIC_ASSET_EXTENSIONS =
	/\.(?:avif|gif|ico|jpe?g|png|svg|webp|txt|xml|json|map)$/i

const SUPABASE_AUTH_COOKIE_CANDIDATES = [
	'sb-access-token',
	'supabase-auth-token',
	'supabase.auth.token'
] as const

const THEME_COOKIE_KEYS = ['tenantflow-theme', 'theme', 'next-theme'] as const

const PROTECTED_ROUTE_PREFIXES = ['/dashboard'] as const
const PUBLIC_AUTH_ROUTES = [
	'/auth/login',
	'/auth/register',
	'/auth/sign-up',
	'/login'
] as const

const DESIGN_SYSTEM_HEADER = 'x-tenantflow-theme'

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	if (shouldBypass(pathname)) {
		return NextResponse.next()
	}

	const response = NextResponse.next({
		request: {
			headers: new Headers(request.headers)
		}
	})

	applySecurityHeaders(response)
	surfaceThemePreference(request, response)

	const hasSupabaseSession = detectSupabaseSession(request)
	const protectedRoute = isProtectedRoute(pathname)
	const publicAuthRoute = isAuthRoute(pathname)

	if (protectedRoute && !hasSupabaseSession) {
		const loginUrl = new URL('/login', request.url)
		loginUrl.searchParams.set('redirectTo', pathname)

		if (process.env.NODE_ENV === 'development') {
			console.info(
				`[middleware] redirecting unauthenticated user → ${loginUrl}`
			)
		}

		return NextResponse.redirect(loginUrl)
	}

	if (publicAuthRoute && hasSupabaseSession) {
		const dashboardUrl = new URL('/dashboard', request.url)

		if (process.env.NODE_ENV === 'development') {
			console.info(
				'[middleware] authenticated user on auth route → dashboard redirect'
			)
		}

		return NextResponse.redirect(dashboardUrl)
	}

	if (
		process.env.NODE_ENV === 'development' &&
		protectedRoute &&
		hasSupabaseSession
	) {
		console.info(`[middleware] allowing authenticated access to ${pathname}`)
	}

	return response
}

export const config = {
	matcher: ['/:path*']
}

function shouldBypass(pathname: string): boolean {
	if (PUBLIC_ASSET_EXTENSIONS.test(pathname)) {
		return true
	}

	return STATIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function detectSupabaseSession(request: NextRequest): boolean {
	const { cookies } = request

	for (const name of SUPABASE_AUTH_COOKIE_CANDIDATES) {
		if (cookies.get(name)?.value) {
			return true
		}
	}

	for (const cookie of cookies.getAll()) {
		if (
			cookie.name.startsWith('sb-') &&
			cookie.name.endsWith('-auth-token') &&
			cookie.value
		) {
			return true
		}
	}

	return false
}

function isProtectedRoute(pathname: string): boolean {
	return PROTECTED_ROUTE_PREFIXES.some(
		prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
	)
}

function isAuthRoute(pathname: string): boolean {
	return PUBLIC_AUTH_ROUTES.includes(
		pathname as (typeof PUBLIC_AUTH_ROUTES)[number]
	)
}

function applySecurityHeaders(response: NextResponse) {
	response.headers.set('Content-Security-Policy', getCSPString())
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('X-DNS-Prefetch-Control', 'on')
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=()'
	)
	response.headers.set(
		'Strict-Transport-Security',
		'max-age=63072000; includeSubDomains; preload'
	)
	response.headers.set('Accept-CH', 'Sec-CH-Prefers-Color-Scheme')
	response.headers.set(
		'Vary',
		mergeVaryHeaders(
			response.headers.get('Vary'),
			'Sec-CH-Prefers-Color-Scheme'
		)
	)

	response.headers.delete('X-Powered-By')
}

function surfaceThemePreference(request: NextRequest, response: NextResponse) {
	const theme = resolveTheme(request)

	if (!theme) {
		return
	}

	response.headers.set(DESIGN_SYSTEM_HEADER, theme)

	const currentCookie = request.cookies.get('tenantflow-theme')?.value as
		| ThemeMode
		| undefined

	if (!currentCookie || currentCookie !== theme) {
		response.cookies.set('tenantflow-theme', theme, {
			sameSite: 'lax',
			secure: process.env.NODE_ENV !== 'development',
			path: '/',
			maxAge: 60 * 60 * 24 * 365 // 1 year
		})
	}
}

function resolveTheme(request: NextRequest): ThemeMode | null {
	const headerTheme = normalizeThemeValue(
		request.headers.get('sec-ch-prefers-color-scheme')
	)
	if (headerTheme) {
		return headerTheme
	}

	for (const key of THEME_COOKIE_KEYS) {
		const candidate = request.cookies.get(key)?.value
		const normalized = normalizeThemeValue(candidate)
		if (normalized) {
			return normalized
		}
	}

	return null
}

function normalizeThemeValue(
	value: string | null | undefined
): ThemeMode | null {
	if (!value) {
		return null
	}

	const lower = value.trim().toLowerCase()

	if (lower === 'dark' || lower === 'light' || lower === 'system') {
		return lower
	}

	if (lower === 'auto') {
		return 'system'
	}

	return null
}

function mergeVaryHeaders(existing: string | null, value: string): string {
	if (!existing) {
		return value
	}

	const values = new Set(
		existing
			.split(',')
			.map(item => item.trim())
			.filter(Boolean)
	)
	values.add(value)
	return Array.from(values).join(', ')
}
