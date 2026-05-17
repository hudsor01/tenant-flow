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
 * Usage in a child layout:
 *   export const metadata = ownerPageMetadata("Income Statement");
 */
export function ownerPageMetadata(title: string): Metadata {
	return {
		title,
		openGraph: { title },
		twitter: { title },
	};
}
