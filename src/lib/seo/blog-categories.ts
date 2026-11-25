/**
 * Blog category slug -> human display label map.
 *
 * The `blogs.category` column stores the kebab slug directly (e.g.
 * `software-vault`, `lease-law`) — NOT a human-readable name. The
 * `get_blog_categories` RPC therefore returns `name === slug` (both kebab),
 * so rendering `category.name` verbatim as an `<h1>`/`<title>` shows the raw
 * slug to users and search engines. This map is the single source of truth
 * for converting a category slug to its display label across the breadcrumb,
 * category-page heading/title/meta, and the post-page breadcrumb so the
 * visible label and the JSON-LD `BreadcrumbList` node can never drift.
 */
export const CATEGORY_LABELS: Record<string, string> = {
	"lease-law": "Lease Law",
	"software-vault": "Software Vault",
	"tax-prep": "Tax Prep",
	"tenant-screening": "Tenant Screening",
	maintenance: "Maintenance",
};

/**
 * Resolve a category slug to its display label. Falls back to a
 * title-cased rendering of the slug for any category not yet in the map so
 * a newly-seeded category never renders an empty heading — it just shows a
 * best-effort label until added above.
 */
export function categoryLabel(slug: string): string {
	const known = CATEGORY_LABELS[slug];
	if (known) return known;
	return slug
		.split("-")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * A category page is indexed, and listed in the sitemap, only once it holds
 * this many posts. A one- or two-card page with a templated description reads
 * as thin content (2026-11-24 SEO audit CT-2). Below it the page is
 * `noindex, follow`: still crawlable, so its posts are found, and it joins
 * the index by itself as posts are published.
 */
export const MIN_INDEXED_CATEGORY_POSTS = 3;
