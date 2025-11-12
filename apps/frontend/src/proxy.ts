import { updateSession } from '#lib/supabase/middleware'
import { type NextRequest } from 'next/server'

/**
 * Next.js 15 Middleware - Supabase SSR Authentication
 *
 * KNOWN VERCEL WARNING: "Unable to find source file for page middleware"
 * This is a cosmetic Vercel monorepo build warning that does NOT affect functionality.
 * Middleware works correctly in production. See CLAUDE.md Deployment section for details.
 */
export async function proxy(request: NextRequest) {
	// Update session with production-ready auth, payment gating, and role-based redirects
	return await updateSession(request)
}

export const config = {
    matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public assets with extensions
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
	]
}
