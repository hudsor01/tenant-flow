import { updateSession } from '#lib/supabase/proxy'
import { type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
	return await updateSession(request)
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
		 * - manifest.json, sw.js, robots.txt (PWA/static assets)
		 * - sitemap files
		 * - .well-known directory
		 */
		'/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|robots\\.txt|sitemap.*\\.xml|structured-data\\.json|browserconfig\\.xml|\\.well-known/|_redirects|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
	]
}
