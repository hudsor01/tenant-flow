import type { Metadata } from 'next'

import { createPageMetadata } from '#lib/seo/page-metadata'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { getSiteUrl } from '#lib/generate-metadata'

import MarketingHomePage from './marketing-home'

// Pre-render at build time and serve from edge cache — content is fully static.
// Middleware still runs and will redirect authenticated users to /dashboard.
export const dynamic = 'force-static'

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management Software for Small Landlords',
	description:
		'All-in-one rental property management software for landlords with 1-20 units. Automate online rent collection, track maintenance requests, screen tenants, and manage finances. 14-day free trial, no credit card required.',
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
	// Uses Record spread for Google's non-standard `query-input` property
	const websiteSchema = {
		'@context': 'https://schema.org' as const,
		'@type': 'WebSite' as const,
		name: 'TenantFlow',
		url: siteUrl,
		description: 'Professional property management software for modern landlords.',
		potentialAction: {
			'@type': 'SearchAction' as const,
			target: `${siteUrl}/search?q={search_term_string}`,
			'query-input': 'required name=search_term_string'
		}
	} satisfies Record<string, unknown>

	return (
		<>
			<JsonLdScript schema={websiteSchema as import('schema-dts').WithContext<import('schema-dts').WebSite>} />
			<MarketingHomePage />
		</>
	)
}
