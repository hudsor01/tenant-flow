import type { Metadata } from "next";

const TITLE_SUFFIX = " | TenantFlow";

/**
 * Build a Next.js Metadata object for an owner-side (authenticated)
 * sub-route layout. Bakes the " | TenantFlow" suffix into ALL three
 * title fields (document title, openGraph.title, twitter.title) so
 * no surface depends on Next.js's title.template propagation.
 *
 * Iteration history (PR #724 → #726 → THIS):
 *
 * - PR #724: per-route layouts set `title: "Income Statement"`.
 *   Document title relied on the (owner)/layout.tsx parent's
 *   `title.template = "%s | TenantFlow"` propagating; og:title
 *   used the marketing default — broken sharing previews.
 *
 * - PR #725 cycle-1: helper introduced. Set `openGraph.title` +
 *   `twitter.title` to plain strings, relied on the parent template
 *   to apply the suffix. Worked for direct children of (owner) but
 *   not deep leaves under intermediate layouts (analytics/*, etc.)
 *   because intermediate `openGraph: { title: string }` shallow-
 *   merges and clobbers the parent template object.
 *
 * - PR #726: baked suffix into openGraph.title + twitter.title.
 *   Session 14 caught this introduced a DOUBLE suffix on direct
 *   children of (owner) (parent template still applied to the
 *   already-suffixed child string → "Dashboard | TenantFlow |
 *   TenantFlow"), and the document title still missed the suffix
 *   on deep leaves (Next.js title.template only propagates one
 *   level; intermediate layouts with plain-string titles don't
 *   re-export it to grandchildren).
 *
 * - THIS commit (PR #727): bake the suffix into ALL THREE fields
 *   and remove the parent (owner)/layout.tsx title/openGraph.title
 *   /twitter.title templates entirely. No template means no
 *   propagation problem AND no double-suffix problem. Every leaf
 *   writes the full string; Next.js metadata merge just passes
 *   it through.
 *
 * The `description` arg restores per-layout descriptions that the
 * original refactor accidentally dropped (PR #725 cycle-2).
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
	const suffixed = `${title}${TITLE_SUFFIX}`;
	const descPart = description ? { description } : {};
	return {
		title: suffixed,
		...descPart,
		openGraph: { title: suffixed, ...descPart },
		twitter: { title: suffixed, ...descPart },
	};
}
