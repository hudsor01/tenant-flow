import type { Metadata } from 'next'

import { createPageMetadata } from '#lib/seo/page-metadata'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { getSiteUrl } from '#lib/generate-metadata'

import MarketingHomePage from './marketing-home'

// Pre-render at build time and serve from edge cache — content is fully static.
// Middleware still runs and will redirect authenticated users to /dashboard.
export const dynamic = 'force-static'

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management Software for Modern Landlords',
	description:
		'Streamline rent collection, maintenance tracking, tenant screening, and financial reporting. Start free and scale as your portfolio grows.',
	path: '/'
})

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
	const siteUrl = getSiteUrl()

	// WebSite schema with SearchAction for sitelinks search box (SCHEMA-03)
	const websiteSchema = {
		'@type': 'WebSite' as const,
		name: 'TenantFlow',
		url: siteUrl,
		description: 'Professional property management software for modern landlords.',
		potentialAction: {
			'@type': 'SearchAction' as const,
			target: `${siteUrl}/search?q={search_term_string}`,
			'query-input': 'required name=search_term_string'
		}
	}

	return (
		<>
			<JsonLdScript schema={websiteSchema as Parameters<typeof JsonLdScript>[0]['schema']} />
			<MarketingHomePage />
		</>
	)
}
