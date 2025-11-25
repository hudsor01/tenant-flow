import { getClaims } from '#lib/dal'
import { redirect } from 'next/navigation'
import MarketingHomePage from './marketing-home'

/**
 * Smart Root Page - Next.js 16 Pattern
 *
 * This page implements role-based routing at the root path:
 * - Unauthenticated users: See marketing homepage
 * - OWNER role: Redirect to /dashboard
 * - TENANT role: Redirect to /tenant
 *
 * Architecture:
 * - Uses DAL getClaims() to fetch JWT claims (proxy handles auth)
 * - Server Component (async) for server-side redirects
 * - No client-side flash of wrong content
 */
export default async function RootPage() {
	const { claims } = await getClaims()

	if (!claims) {
		// Show marketing homepage for unauthenticated users
		return <MarketingHomePage />
	}

	// Get role from JWT (custom access token hook sets in app_metadata)
	const appMetadata = claims.app_metadata as import('#types/supabase-metadata').SupabaseAppMetadata
	const role = appMetadata?.user_type

	// Redirect authenticated users to their appropriate dashboard
	if (role === 'OWNER') {
		redirect('/dashboard')
	} else if (role === 'TENANT') {
		redirect('/tenant')
	} else {
		// Unknown/missing role - proxy will handle on next navigation
		redirect('/login')
	}
}
