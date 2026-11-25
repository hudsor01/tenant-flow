import type { Metadata } from "next";
import { getPricingPlan, type PricingConfig } from "#config/pricing";
import { env } from "#env";
import { DiagnosticError } from "#lib/diagnostic-error";
import { OG_CARDS, ogCardAlt, ogCardPath } from "#lib/seo/og-cards";

const PRODUCTION_URL = "https://tenantflow.app";

// Use getter to ensure env var is read at runtime, not compile time
// Falls back to VERCEL_URL during build, or production URL as final fallback
export function getSiteUrl(): string {
	// Primary: explicit app URL (validated by t3-env)
	if (env.NEXT_PUBLIC_APP_URL) {
		return env.NEXT_PUBLIC_APP_URL;
	}

	// Vercel provides this during build and runtime
	if (env.VERCEL_URL) {
		return `https://${env.VERCEL_URL}`;
	}

	// Production fallback for static generation
	return PRODUCTION_URL;
}

// Lazy initialization - computed when first accessed
let _defaultMetadata: Metadata | null = null;

function createDefaultMetadata(): Metadata {
	const SITE_URL = getSiteUrl();
	return {
		metadataBase: new URL(SITE_URL),
		title: {
			template: "%s | TenantFlow",
			default:
				"TenantFlow | Property Management Software for Independent Landlords",
		},
		description:
			"Property management software built for independent landlords. Track leases, maintenance, tenants, and finances in one place. 14-day free trial.",
		// `keywords` meta is ignored by Google (confirmed unchanged since
		// the 2009 Search Central post) and Bing. Stripped — was dead
		// bytes in every page <head>.
		authors: [{ name: "TenantFlow" }],
		creator: "TenantFlow",
		publisher: "TenantFlow",
		robots:
			"index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
		alternates: {
			// No root-default canonical — the homepage sets its own via
			// createPageMetadata({ path: "/" }), and every public page
			// defines its own. Metadata-less pages emit no canonical instead
			// of a wrong one (SEO-15).
		},
		openGraph: {
			title:
				"TenantFlow | Property Management Software for Independent Landlords",
			description:
				"Landlord-only property management software. Track leases, maintenance, and tenants. Plans from $19/mo.",
			url: SITE_URL,
			siteName: "TenantFlow",
			type: "website",
			locale: "en_US",
			images: [
				{
					url: `${SITE_URL}${ogCardPath("site")}`,
					width: 1200,
					height: 630,
					alt: ogCardAlt(OG_CARDS.site),
					type: "image/png",
				},
				{
					url: `${SITE_URL}/tenant-flow-logo.png`,
					width: 800,
					height: 600,
					alt: "TenantFlow Logo",
					type: "image/png",
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title:
				"TenantFlow | Property Management Software for Independent Landlords",
			description:
				"Landlord-only property management software. Track leases, maintenance, and tenants. Plans from $19/mo.",
			images: [
				{
					url: `${SITE_URL}${ogCardPath("site")}`,
					alt: ogCardAlt(OG_CARDS.site),
				},
			],
		},
		applicationName: "TenantFlow",
		referrer: "origin-when-cross-origin",
		generator: "Next.js",
		formatDetection: {
			email: false,
			address: false,
			telephone: false,
		},
		icons: {
			icon: [
				{ url: "/favicon.ico", sizes: "48x48" },
				{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
				{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
			],
			apple: [
				{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
			],
		},
		manifest: "/manifest.json",
	};
}

// Getter for lazy initialization
function getDefaultMetadata(): Metadata {
	if (!_defaultMetadata) {
		_defaultMetadata = createDefaultMetadata();
	}
	return _defaultMetadata;
}

/**
 * The Organization node's `@id` (2026-11-24 SEO audit S6). Every other node
 * that names TenantFlow (the product, the blog posts, the about and contact
 * pages) points here with `organizationRef()`, so search engines read one
 * connected entity instead of several same-named ones.
 */
function organizationId(): string {
	return `${getSiteUrl()}/#organization`;
}

/** A reference to the Organization node, for `author`, `publisher` and the like. */
export function organizationRef(): { "@id": string } {
	return { "@id": organizationId() };
}

/**
 * Organization JSON-LD — emitted site-wide (every route) via `SeoJsonLd` in
 * the root layout. The Organization entity is route-neutral brand identity
 * and is correct on every page, including `/blog/*`.
 */
export function getOrganizationJsonLd() {
	const SITE_URL = getSiteUrl();

	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": organizationId(),
		name: "TenantFlow",
		url: SITE_URL,
		// Square, as Google asks for a logo (S8): the 512x512 brand mark.
		logo: {
			"@type": "ImageObject",
			url: `${SITE_URL}/icon-512x512.png`,
			width: 512,
			height: 512,
		},
		description:
			"Property management software for independent landlords. Track leases, maintenance, and tenants. 14-day free trial.",
		foundingDate: "2024",
		// Email only: no phone line is answered, so none is published
		// (2026-11-24 audit CT2). Search engines cross-check contact details
		// against the pages, which list support@ alone.
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "Customer Service",
			email: "support@tenantflow.app",
			areaServed: "US",
			availableLanguage: "English",
		},
		// Only profiles TenantFlow owns (owner D-04, 2026-11-25): a sameAs
		// pointing at someone else's account merges two entities. There is no
		// TenantFlow X/Twitter or LinkedIn account, so no @tenantflow tags either.
		sameAs: ["https://facebook.com/tenantflow"],
	};
}

/** The paid plans, in price order, from `src/config/pricing.ts`. */
function paidPlans(): PricingConfig[] {
	return (["starter", "growth", "max"] as const).map((id) => {
		const plan = getPricingPlan(id);
		if (!plan) {
			throw new DiagnosticError(
				`generate-metadata: no "${id}" plan in pricing.ts`,
			);
		}
		return plan;
	});
}

/**
 * One Offer per plan and billing period (2026-11-24 SEO audit P3): the
 * machine-readable price list that AI answers and shopping surfaces read.
 */
function planOffers(siteUrl: string) {
	return paidPlans().flatMap((plan) =>
		(
			[
				["monthly", "P1M"],
				["annual", "P1Y"],
			] as const
		).map(([period, billingDuration]) => ({
			"@type": "Offer",
			name: `${plan.name} (${period === "monthly" ? "monthly" : "annual"})`,
			price: String(plan.price[period]),
			priceCurrency: "USD",
			priceSpecification: {
				"@type": "UnitPriceSpecification",
				price: String(plan.price[period]),
				priceCurrency: "USD",
				billingDuration,
			},
			url: `${siteUrl}/pricing`,
			availability: "https://schema.org/InStock",
		})),
	);
}

/** The monthly price range across the paid plans. */
function offerRange() {
	const prices = paidPlans().map((plan) => plan.price.monthly);
	return {
		"@type": "AggregateOffer",
		priceCurrency: "USD",
		lowPrice: String(Math.min(...prices)),
		highPrice: String(Math.max(...prices)),
		offerCount: String(prices.length),
		availability: "https://schema.org/InStock",
	};
}

/**
 * SoftwareApplication JSON-LD — the commercial product entity. Emitted ONLY
 * on the homepage, /features and /pricing, NOT site-wide. On `/blog/*` a
 * site-wide SoftwareApplication node competes with each post's `BlogPosting`
 * for the page's primary-entity signal and dilutes it — the same reason PR
 * 674 dropped SoftwareApplication from the compare pages.
 *
 * `offers: "plans"` (the pricing page) lists every plan and billing period;
 * elsewhere it is the monthly price range. Both come from the pricing config.
 */
export function getSoftwareApplicationJsonLd(
	options: { offers?: "range" | "plans" } = {},
) {
	const SITE_URL = getSiteUrl();

	return {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "TenantFlow",
		applicationCategory: "BusinessApplication",
		applicationSubCategory: "Property Management Software",
		operatingSystem: "Web Browser",
		description:
			"Property management software for independent landlords. Track leases, maintenance, tenants, and financial reporting. 14-day free trial.",
		url: SITE_URL,
		image: [`${SITE_URL}${ogCardPath("site")}`, `${SITE_URL}/icon-512x512.png`],
		author: organizationRef(),
		publisher: organizationRef(),
		offers: options.offers === "plans" ? planOffers(SITE_URL) : offerRange(),
		featureList: [
			"Property Management",
			"Tenant Records",
			"Lease Management",
			"Maintenance Tracking",
			"Financial Reporting",
			"Document Vault",
			"Lease E-Signing",
		],
	};
}

/**
 * Both global brand entities, in render order. Retained for the SEO-03
 * regression test that pins the combined shape; production code uses the
 * granular getters so `SeoJsonLd` can keep SoftwareApplication off blog
 * pages.
 */
export function getJsonLd() {
	return [getOrganizationJsonLd(), getSoftwareApplicationJsonLd()];
}

export async function generateSiteMetadata(): Promise<Metadata> {
	// In future this can be extended to accept params and compute per-route metadata
	return getDefaultMetadata();
}
