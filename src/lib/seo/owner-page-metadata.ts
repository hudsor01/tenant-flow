import type { Metadata } from "next";

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
 * `title` field. This helper closes that gap by setting all three
 * fields from a single source string.
 *
 * Cycle-2 review widened the signature to accept an optional
 * `description`. The original per-layout `description` strings (e.g.
 * "Overview of your property portfolio, revenue, and activity" on
 * /dashboard) were dropped by the initial refactor; this argument
 * restores them so the browser tab tooltip + meta description on
 * each route stays route-specific.
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
	return {
		title,
		...(description ? { description } : {}),
		openGraph: { title, ...(description ? { description } : {}) },
		twitter: { title, ...(description ? { description } : {}) },
	};
}
