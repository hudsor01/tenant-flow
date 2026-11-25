import type { Metadata } from "next";
import type { SoftwareApplication, WebSite, WithContext } from "schema-dts";
import { JsonLdScript } from "#components/seo/json-ld-script";
import {
	getSiteUrl,
	getSoftwareApplicationJsonLd,
	organizationRef,
} from "#lib/generate-metadata";
import { createPageMetadata } from "#lib/seo/page-metadata";

import MarketingHomePage from "./marketing-home";

// Pre-render at build time and serve from edge cache — content is fully static.
// Middleware still runs and will redirect authenticated users to /dashboard.
export const dynamic = "force-static";

export const metadata: Metadata = createPageMetadata({
	title: "Property Management Software for Landlords",
	description:
		"Property management software for independent landlords. Track leases, maintenance, tenants, and documents in one place. 14-day free trial, no card needed.",
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

	// WebSite: the site's name for search results, published by the
	// Organization. No SearchAction: Google retired the sitelinks search box
	// on 2024-11-21, so it earned nothing (2026-11-24 SEO audit S2).
	const websiteSchema: WithContext<WebSite> = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "TenantFlow",
		url: siteUrl,
		description:
			"Property management software for independent landlords. Track leases, maintenance, tenants, and finances in one place.",
		publisher: organizationRef(),
	};

	// SoftwareApplication + AggregateOffer — the commercial product entity.
	// Scoped to the homepage (NOT site-wide) so it doesn't dilute the Article
	// schema on `/blog/*` posts. See getSoftwareApplicationJsonLd().
	const softwareSchema =
		getSoftwareApplicationJsonLd() as WithContext<SoftwareApplication>;

	return (
		<>
			<JsonLdScript schema={websiteSchema} />
			<JsonLdScript schema={softwareSchema} />
			<MarketingHomePage />
		</>
	);
}
