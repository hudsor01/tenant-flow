export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import ModalLayout from "#components/layout/modal-layout";
import { OwnerDashboardLayout } from "./owner-dashboard-layout";

// Auth-walled. Block search engines from indexing dashboard pages even
// if they bypass robots.txt or follow internal links.
//
// Session 14 (PR #727) removed the previous `title.template` /
// `openGraph.title.template` / `twitter.title.template` from this
// layout entirely. The templates were the root cause of two
// regressions chained across PR #724 → #725 → #726:
//   - PR #725: children setting plain-string openGraph.title relied
//     on the template — broken on deep leaves because intermediate
//     layouts shallow-clobbered the parent openGraph object.
//   - PR #726: helper baked the suffix into openGraph.title — direct
//     children of (owner) got "Dashboard | TenantFlow | TenantFlow"
//     because the template applied to the already-suffixed string.
// Every leaf now uses `ownerPageMetadata()` which bakes the suffix
// into all three title fields. No template = no propagation problem
// and no double-suffix problem.
//
// `default` values are kept ONLY as a fallback for the (theoretical)
// case where a route doesn't set its own title — every real route
// has a child layout that calls ownerPageMetadata, so the defaults
// don't fire in practice.
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
