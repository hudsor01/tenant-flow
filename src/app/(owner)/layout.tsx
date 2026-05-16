export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import ModalLayout from "#components/layout/modal-layout";
import { OwnerDashboardLayout } from "./owner-dashboard-layout";

// Auth-walled. Block search engines from indexing dashboard pages even
// if they bypass robots.txt or follow internal links. Also override
// openGraph/twitter so shared dashboard URLs don't preview as the
// marketing homepage default (Session 11 P2 #21).
//
// Session 12 P3: use Next.js metadata title templates so per-route
// sub-layouts (analytics/*, financials/*, maintenance/new, etc.)
// flow their `title` into og:title and twitter:title automatically.
// The literal "TenantFlow Dashboard" fallback only fires if a child
// route doesn't set its own title.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
	openGraph: {
		title: { template: "%s | TenantFlow", default: "TenantFlow Dashboard" },
		description: "Authenticated TenantFlow app — landlord dashboard.",
		images: [],
	},
	twitter: {
		card: "summary",
		title: { template: "%s | TenantFlow", default: "TenantFlow Dashboard" },
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
