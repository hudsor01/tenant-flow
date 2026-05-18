import type { Metadata } from "next";

import { getSiteUrl } from "#lib/generate-metadata";

interface PageMetadataConfig {
	title: string;
	description: string;
	path: string;
	noindex?: boolean;
	ogImage?: string;
	/**
	 * When true, emit `title: { absolute: "<title> | TenantFlow" }` instead of
	 * a plain string. Plain-string titles get the root layout's
	 * `title.template` ("%s | TenantFlow") prepended ONLY for nested route
	 * segments — the root segment (`/` at `src/app/page.tsx`) sits at the
	 * same depth as the root layout and Next.js does not apply the template
	 * there. Without this opt-in the homepage would render
	 * `<title>Property Management Software for Independent Landlords</title>` with no
	 * brand suffix while every other page renders `... | TenantFlow`.
	 *
	 * Use `absoluteTitle: true` for any page sharing the root segment.
	 * For nested pages leave it off so the template is the single source
	 * of truth for the suffix.
	 *
	 * Today the ONLY caller using this flag is `src/app/page.tsx`. Any
	 * NEW file added under `src/app/*.tsx` (i.e. a sibling of
	 * `page.tsx`/`layout.tsx`/`loading.tsx`) is also on the root segment
	 * and MUST set `absoluteTitle: true` to render the brand suffix.
	 */
	absoluteTitle?: boolean;
}

/**
 * Create consistent Next.js Metadata for a public page.
 * Generates canonical URL, OG tags, and Twitter card from minimal config.
 */
export function createPageMetadata(config: PageMetadataConfig): Metadata {
	const { title, description, path, noindex, ogImage, absoluteTitle } = config;
	const siteUrl = getSiteUrl();
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const canonicalUrl = `${siteUrl}${normalizedPath}`;
	const normalizedOgImage = ogImage
		? /^https?:\/\//.test(ogImage)
			? ogImage
			: `${siteUrl}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`
		: undefined;
	const imageUrl =
		normalizedOgImage ?? `${siteUrl}/images/property-management-og.jpg`;
	// Brand-suffixed form used for openGraph + twitter + image alt on every
	// page (those fields don't inherit `title.template`, so we apply the
	// suffix here for consistency with the rendered <title>). For the doc
	// title, `absoluteTitle` decides whether to short-circuit the template
	// (root segment) or let the template apply the suffix (nested segments).
	//
	// Skip the suffix if the title already contains "TenantFlow" — e.g.
	// `/contact` ("Contact TenantFlow Property Management Support") and
	// `/compare` ("Compare TenantFlow to Other Property Management
	// Software") would otherwise render `"... | TenantFlow"` with a
	// duplicate brand token in OG/Twitter previews. The doc-title side
	// has the same risk via `title.template`; those pages are renamed
	// in this PR to drop the embedded "TenantFlow" so the suffix is
	// additive everywhere.
	// Word-boundary match so a hypothetical title like "TenantFlowing" or
	// "tenant-flow rivers" wouldn't accidentally suppress the suffix.
	const alreadyBranded = /\bTenantFlow\b/i.test(title);
	const suffixed = alreadyBranded ? title : `${title} | TenantFlow`;

	return {
		title: absoluteTitle ? { absolute: suffixed } : title,
		description,
		alternates: {
			canonical: canonicalUrl,
		},
		openGraph: {
			title: suffixed,
			description,
			url: canonicalUrl,
			siteName: "TenantFlow",
			type: "website",
			locale: "en_US",
			images: [
				{
					url: imageUrl,
					width: 1200,
					height: 630,
					alt: suffixed,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: suffixed,
			description,
			images: [imageUrl],
		},
		...(noindex ? { robots: "noindex, follow" } : {}),
	};
}
