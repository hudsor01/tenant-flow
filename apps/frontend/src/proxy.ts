import { updateSession } from '#lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'Proxy' })

/**
 * Next.js 16 Proxy Handler - Supabase SSR Authentication
 *
 * Runs on every request to:
 * - Validate session cookies and JWT tokens
 * - Verify JWT signatures using Supabase JWKS
 * - Enforce route protection (redirect unauthenticated users to /login)
 * - Implement payment gating (redirect non-paying users to /pricing)
 * - Handle user-type based redirects (TENANT -> /tenant, others -> /manage)
 */
export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname
	logger.info('[PROXY_CALLED]', { pathname })
	
	try {
		const response = await updateSession(request)
		logger.info('[PROXY_RESPONSE]', {
			pathname,
			status: response.status,
			isRedirect: response.status >= 300 && response.status < 400
		})
		return response
	} catch (error) {
		logger.error('[PROXY_ERROR]', {
			pathname,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined
		})
		// Return the request unchanged if proxy fails
		return NextResponse.next({ request })
	}
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization)
		 * - favicon.ico (favicon)
		 * - public assets (*.svg, *.png, *.jpg, etc.)
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
	]
}