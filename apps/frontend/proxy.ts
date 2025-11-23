import { updateSession } from '#lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'Proxy' })

/**
 * Next.js 16 Proxy Handler - Supabase SSR Authentication
 *
 * Entry point for authentication and session validation.
 * Called by Next.js on every request matching the config.matcher patterns.
 *
 * Responsibilities:
 * - Error handling and logging for auth operations
 * - Delegate session validation to updateSession (auth business logic)
 * - Return appropriate response or redirect
 *
 * Architecture:
 * - proxy.ts (this file): Transport layer, error boundaries, logging
 * - lib/supabase/middleware.ts: Auth business logic (JWT verification, redirects)
 */
export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname

	try {
		logger.debug('[PROXY_START]', { pathname })

		// Delegate to auth middleware
		const response = await updateSession(request)

		logger.debug('[PROXY_COMPLETE]', {
			pathname,
			status: response.status,
			isRedirect: response.status >= 300 && response.status < 400
		})

		return response
	} catch (error) {
		// Fail closed: redirect to login on any auth errors
		logger.error('[PROXY_ERROR]', {
			pathname,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		})

		return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
	}
}

/**
 * Matcher configuration for Next.js 16 Proxy
 *
 * Matches all request paths except:
 * - Static assets (_next/static, _next/image)
 * - Public files (favicon, images, etc.)
 *
 * This ensures auth validation runs on all dynamic requests.
 */
export const config = {
	matcher: [
		'/((?!_next/static|_next/image|assets/|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:js|css|map|txt|xml|json|ico|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf|mp4|webm)$).*)'
	]
}
