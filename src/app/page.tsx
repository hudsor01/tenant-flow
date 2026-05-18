import type { Metadata } from "next";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { getSiteUrl } from "#lib/generate-metadata";
import { createPageMetadata } from "#lib/seo/page-metadata";

import MarketingHomePage from "./marketing-home";

// Pre-render at build time and serve from edge cache — content is fully static.
// Middleware still runs and will redirect authenticated users to /dashboard.
export const dynamic = "force-static";

export const metadata: Metadata = createPageMetadata({
	title: "Property Management Software for Independent Landlords",
	description:
		"All-in-one property management software for independent landlords. Track leases, maintenance requests, tenant records, and finances in one place. 14-day free trial, no credit card required.",
	path: "/",
	// Root segment: Next.js does not apply the root layout's
	// `title.template` here, so without `absoluteTitle` the homepage
	// renders `<title>...</title>` with no ` | TenantFlow` suffix
	// (caught by the AUDIT-1 browser-agent sweep, 2026-05-18).
	absoluteTitle: true,
});

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
	const siteUrl = getSiteUrl();

	// WebSite schema with SearchAction for sitelinks search box (SCHEMA-03)
	// Uses Record spread for Google's non-standard `query-input` property
	const websiteSchema = {
		"@context": "https://schema.org" as const,
		"@type": "WebSite" as const,
		name: "TenantFlow",
		url: siteUrl,
		description:
			"Property management software for independent landlords. Track leases, maintenance, tenants, and finances in one place.",
		potentialAction: {
			"@type": "SearchAction" as const,
			target: `${siteUrl}/search?q={search_term_string}`,
			"query-input": "required name=search_term_string",
		},
	} satisfies Record<string, unknown>;

	return (
		<>
			<JsonLdScript
				schema={
					websiteSchema as import("schema-dts").WithContext<
						import("schema-dts").WebSite
					>
				}
			/>
			<MarketingHomePage />
		</>
	);
}
