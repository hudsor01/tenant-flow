import type { Metadata } from "next";
import { env } from "#env";

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
			default: "TenantFlow — Property Management Software for Landlords",
		},
		description:
			"Property administration software built for landlords with 1–15 rentals. Track leases, maintenance, tenants, and finances in one place. 14-day free trial.",
		// `keywords` meta is ignored by Google (confirmed unchanged since
		// the 2009 Search Central post) and Bing. Stripped — was dead
		// bytes in every page <head>.
		authors: [{ name: "TenantFlow" }],
		creator: "TenantFlow",
		publisher: "TenantFlow",
		robots:
			"index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
		alternates: {
			canonical: SITE_URL,
			// `languages` was set to `{ 'en-US': SITE_URL }` — declaring an
			// alternate that equals the canonical is a no-op signal that
			// some hreflang validators flag. Removed until we ship real
			// localized content.
		},
		openGraph: {
			title: "TenantFlow — Property Management Software for Landlords",
			description:
				"All-in-one rental property administration. Track leases, maintenance, and tenants. Plans from $19/mo.",
			url: SITE_URL,
			siteName: "TenantFlow",
			type: "website",
			locale: "en_US",
			images: [
				{
					url: `${SITE_URL}/images/property-management-og.jpg`,
					width: 1200,
					height: 630,
					alt: "TenantFlow Property Management Dashboard",
					type: "image/jpeg",
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
			title: "TenantFlow — Property Management Software for Landlords",
			description:
				"All-in-one rental property administration. Track leases, maintenance, and tenants. Plans from $19/mo.",
			site: "@tenantflow",
			creator: "@tenantflow",
			images: [`${SITE_URL}/images/property-management-og.jpg`],
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
				{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
				{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
			],
			apple: [
				{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
			],
			other: [
				{
					url: "/safari-pinned-tab.svg",
					rel: "mask-icon",
					// Must be a valid CSS color literal — `var(--color-info)`
					// would not resolve in the rendered <meta> tag because
					// CSS custom properties don't apply to HTML attribute
					// values. Hex matches `--color-primary` so the pinned-tab
					// icon stays brand-aligned.
					color: "#2563eb",
				},
			],
		},
		manifest: "/manifest.json",
	};
}

// Getter for lazy initialization
export function getDefaultMetadata(): Metadata {
	if (!_defaultMetadata) {
		_defaultMetadata = createDefaultMetadata();
	}
	return _defaultMetadata;
}

// For backward compatibility - uses getter
export const defaultMetadata: Metadata = new Proxy({} as Metadata, {
	get(_, prop) {
		return getDefaultMetadata()[prop as keyof Metadata];
	},
});

export function getJsonLd() {
	const SITE_URL = getSiteUrl();

	// Organization schema for global presence
	const organization = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "TenantFlow",
		url: SITE_URL,
		logo: `${SITE_URL}/tenant-flow-logo.png`,
		description:
			"Property administration software for landlords with 1–15 rentals. Track leases, maintenance, and tenants. 14-day free trial.",
		foundingDate: "2024",
		// E.164-formatted business line (Schema.org expects digits-only,
		// hyphens optional). The previous vanity `+1-888-TENANT-1`
		// contained letters and was rejected by Google's validator.
		contactPoint: {
			"@type": "ContactPoint",
			telephone: "+1-214-843-0779",
			contactType: "Customer Service",
			email: "support@tenantflow.app",
			areaServed: "US",
			availableLanguage: "English",
		},
		sameAs: [
			"https://twitter.com/tenantflow",
			"https://linkedin.com/company/tenantflow",
			"https://facebook.com/tenantflow",
		],
	};

	// SoftwareApplication schema
	const software = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "TenantFlow",
		applicationCategory: "BusinessApplication",
		applicationSubCategory: "Property Management Software",
		operatingSystem: "Web Browser",
		description:
			"Property administration software for landlords with 1–15 rentals. Track leases, maintenance, tenants, and financial reporting. 14-day free trial.",
		url: SITE_URL,
		image: [
			`${SITE_URL}/images/property-management-og.jpg`,
			`${SITE_URL}/tenant-flow-logo.png`,
		],
		author: {
			"@type": "Organization",
			name: "TenantFlow",
			url: SITE_URL,
		},
		offers: {
			"@type": "AggregateOffer",
			priceCurrency: "USD",
			lowPrice: "19",
			highPrice: "149",
			offerCount: "3",
			availability: "https://schema.org/InStock",
		},
		screenshot: `${SITE_URL}/images/property-management-og.jpg`,
		featureList: [
			"Property Management",
			"Tenant Records",
			"Lease Management",
			"Maintenance Tracking",
			"Financial Reporting",
			"Document Vault",
			"DocuSeal Lease E-Signing",
		],
	};

	return [organization, software];
}

export async function generateSiteMetadata(): Promise<Metadata> {
	// In future this can be extended to accept params and compute per-route metadata
	return getDefaultMetadata();
}

export default defaultMetadata;
