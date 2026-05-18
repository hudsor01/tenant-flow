import type { Metadata } from "next";

const OG_TITLE_SUFFIX = " | TenantFlow";

/**
 * Build a Next.js Metadata object for an owner-side (authenticated)
 * sub-route layout. Wires the page title into title, openGraph.title,
 * AND twitter.title so shared dashboard URLs preview with the
 * page-specific title rather than the parent layout's "TenantFlow
 * Dashboard" default.
 *
 * Session 12 cycle-1 review caught that Next.js metadata templates
 * on openGraph.title only fire when child segments explicitly set
 * `openGraph.title`; they do NOT auto-flow from a child's plain
 * `title` field.
 *
 * Session 13 surfaced a second metadata-merge bug: when an
 * intermediate layout sets `openGraph: { title: "Analytics" }`
 * (a plain string), Next.js's shallow-merge REPLACES the parent's
 * entire `openGraph` object — including the title.template the
 * (owner) parent set. Deeper leaves like /analytics/overview then
 * had no template to apply, so og:title rendered "Overview" with
 * no "| TenantFlow" suffix. Baking the suffix in here removes the
 * dependency on parent template merge entirely.
 *
 * The document `title` field is unaffected — Next.js handles top-
 * level `title.template` specially and it propagates correctly
 * across the merge.
 *
 * The `description` arg restores the per-layout description that
 * the original refactor accidentally dropped (cycle-2 review fix).
 *
 * Usage in a child layout:
 *   export const metadata = ownerPageMetadata(
 *     "Income Statement",
 *     "Revenue, expenses, and profit margin for the selected period",
 *   );
 */
export function ownerPageMetadata(
	title: string,
	description?: string,
): Metadata {
	const ogTitle = `${title}${OG_TITLE_SUFFIX}`;
	return {
		title,
		...(description ? { description } : {}),
		openGraph: { title: ogTitle, ...(description ? { description } : {}) },
		twitter: { title: ogTitle, ...(description ? { description } : {}) },
	};
}
