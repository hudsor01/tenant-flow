export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { OwnerDashboardLayout } from './owner-dashboard-layout'
import ModalLayout from '#components/layout/modal-layout'
import type { ReactNode } from 'react'

// Auth-walled. Block search engines from indexing dashboard pages even if
// they bypass robots.txt or follow internal links.
export const metadata: Metadata = {
	robots: { index: false, follow: false }
}

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
	modal
}: {
	children: ReactNode
	modal?: ReactNode
}) {
	return (
		<OwnerDashboardLayout>
			<ModalLayout modal={modal}>{children}</ModalLayout>
		</OwnerDashboardLayout>
	)
}
