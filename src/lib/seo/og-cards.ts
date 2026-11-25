/**
 * The social-share card each public page shows (2026-11-24 SEO audit S4, C1,
 * RS1, M1, X10, D6, AB10, CT4, Q13, HC9, BL4, H5).
 *
 * Text only. `src/app/api/og/_shared/og-card.tsx` lays a card out as a
 * 1200x630 PNG, served at `/api/og/<key>` by `src/app/api/og/[page]`, and
 * `createPageMetadata` points `og:image` at it with `ogCardAlt` as the alt
 * text. A page that names no card gets `site`, so no page falls back to a
 * stock photo.
 */

import { CATEGORY_LABELS } from "#lib/seo/blog-categories";

export interface OgCard {
	/** The small uppercase line above the headline. */
	eyebrow: string;
	headline: string;
	subline: string;
}

export const OG_CARDS = {
	site: {
		eyebrow: "Property management software",
		headline: "Leases, maintenance, tenants and documents in one place",
		subline: "For independent landlords. Plans from $19/mo.",
	},
	features: {
		eyebrow: "Features",
		headline: "Document vault, lease e-signing & maintenance",
		subline: "The core tools landlords need to run rental properties.",
	},
	pricing: {
		eyebrow: "Pricing",
		headline: "Property management plans from $19/mo",
		subline: "14-day free trial. No credit card required.",
	},
	"compare-overview": {
		eyebrow: "Comparisons",
		headline: "TenantFlow vs Buildium, AppFolio & RentRedi",
		subline: "Pricing and features, side by side.",
	},
	resources: {
		eyebrow: "Free landlord resources",
		headline: "Printable checklists, trackers and reference cards",
		subline: "Maintenance, Schedule E deductions and security deposits.",
	},
	"seasonal-maintenance-checklist": {
		eyebrow: "Free resource",
		headline: "Seasonal maintenance checklist",
		subline: "Spring, summer, fall and winter tasks for rental properties.",
	},
	"landlord-tax-deduction-tracker": {
		eyebrow: "Free resource",
		headline: "Landlord tax deduction tracker",
		subline: "Rental expenses matched to their Schedule E lines.",
	},
	"security-deposit-reference-card": {
		eyebrow: "Free resource",
		headline: "Security deposit rules by state",
		subline: "Limits and return deadlines for all 50 states and DC.",
	},
	about: {
		eyebrow: "About",
		headline: "Property management software for independent landlords",
		subline: "Landlord-only, with a document vault and lease e-signing.",
	},
	contact: {
		eyebrow: "Contact",
		headline: "Talk to the TenantFlow team",
		subline: "Questions, demos and support, answered by email.",
	},
	faq: {
		eyebrow: "FAQ",
		headline: "Answers about leases, documents, billing and security",
		subline: "For independent landlords using TenantFlow.",
	},
	help: {
		eyebrow: "Help center",
		headline: "Set up TenantFlow and get support",
		subline: "Setup guides and answers for landlords.",
	},
	"blog-index": {
		eyebrow: "Blog",
		headline: "Guides for independent landlords",
		subline: "Leases, maintenance, inspections, rent records and taxes.",
	},
} as const satisfies Record<string, OgCard>;

export type OgCardKey = keyof typeof OG_CARDS;

export const OG_CARD_KEYS = Object.keys(OG_CARDS) as OgCardKey[];

/** Where a card's PNG is served, relative to the site. */
export function ogCardPath(key: OgCardKey): string {
	return `/api/og/${key}`;
}

/** A competitor page's card, served by `src/app/api/og/compare/[competitor]`. */
export function compareCard(competitorName: string): OgCard {
	return {
		eyebrow: "Comparison",
		headline: `TenantFlow vs ${competitorName}`,
		subline: "Pricing and features, side by side.",
	};
}

/**
 * A blog category's card (CT-4), served by
 * `src/app/api/og/blog/category/[category]`: the blog card, headed by the
 * category's label.
 */
export function blogCategoryCard(label: string): OgCard {
	return { ...OG_CARDS["blog-index"], headline: `${label} articles & guides` };
}

/**
 * A blog category page's share image: its own card for a category in
 * `CATEGORY_LABELS` (the only ones the route renders), the blog card otherwise.
 */
export function blogCategoryOgImage(slug: string): {
	path: string;
	alt: string;
} {
	const label = Object.hasOwn(CATEGORY_LABELS, slug)
		? CATEGORY_LABELS[slug]
		: undefined;
	if (!label) {
		return {
			path: ogCardPath("blog-index"),
			alt: ogCardAlt(OG_CARDS["blog-index"]),
		};
	}
	return {
		path: `/api/og/blog/category/${slug}`,
		alt: ogCardAlt(blogCategoryCard(label)),
	};
}

/** The `og:image:alt` for a card: what the image shows, not the page title (H5). */
export function ogCardAlt(card: OgCard): string {
	return `TenantFlow logo above the words "${card.headline}"`;
}
