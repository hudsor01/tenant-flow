export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import ModalLayout from "#components/layout/modal-layout";
import { OwnerDashboardLayout } from "./owner-dashboard-layout";

// Auth-walled. Block search engines from indexing dashboard pages even
// if they bypass robots.txt or follow internal links.
//
// Session 14 (PR #727) removed the previous
// `openGraph.title.template` / `twitter.title.template` from this
// layout. Those local templates caused PR #726's helper-baked suffix
// to be applied twice on direct children of (owner) (parent template
// applied to the already-suffixed child string → "X | TenantFlow |
// TenantFlow"). With them gone, the helper's plain-string output is
// what users see in shared-link previews.
//
// The ROOT app/layout (generateSiteMetadata) still has
// `title.template = "%s | TenantFlow"` for the document <title> tag,
// which is used by /pricing, /blog, /compare/*, etc. — most owner
// routes use ownerPageMetadata which writes `title.absolute` to opt
// out of that root template (the suffix is already baked in).
//
// The `"TenantFlow Dashboard"` strings below are fallbacks for the
// theoretical case of an owner route that doesn't set its own
// metadata. Most routes call ownerPageMetadata; a few set
// `metadata: { title: "..." }` directly with a plain string and
// inherit the root title.template — those routes correctly receive
// the suffix via the root, not via the (owner) layer.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
	openGraph: {
		title: "TenantFlow Dashboard",
		description: "Authenticated TenantFlow app — landlord dashboard.",
		images: [],
	},
	twitter: {
		card: "summary",
		title: "TenantFlow Dashboard",
		description: "Authenticated TenantFlow app — landlord dashboard.",
	},
};

/**
 * Owner Dashboard Layout (Next.js 16 Pattern)
 *
 * Auth Strategy:
 * - Proxy enforces auth and role validation
 * - This layout only renders UI components
 * - No auth checks needed (proxy guarantees OWNER role)
 *
 * Modal Support:
 * - Enables intercepting routes for modal-based navigation across all owner routes
 * - Child routes (properties, tenants, leases, etc.) inherit this modal capability
 * - No need for individual layout files in child routes
 */
export default function OwnerLayout({
	children,
	modal,
}: {
	children: ReactNode;
	modal?: ReactNode;
}) {
	return (
		<OwnerDashboardLayout>
			<ModalLayout modal={modal}>{children}</ModalLayout>
		</OwnerDashboardLayout>
	);
}
