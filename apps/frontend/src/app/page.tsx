import MarketingHomePage from './marketing-home'

// Pre-render at build time and serve from edge cache — content is fully static.
// Middleware still runs and will redirect authenticated users to /dashboard.
export const dynamic = 'force-static'

/**
 * Root Page - Marketing Homepage
 *
 * This is the public marketing homepage shown at the root path (/).
 * Always displays the marketing page regardless of authentication status.
 *
 * Role-based routing is handled by:
 * - Middleware (proxy.ts) for protected route access control
 * - Direct navigation from login page after authentication
 */
export default function RootPage() {
	return <MarketingHomePage />
}
