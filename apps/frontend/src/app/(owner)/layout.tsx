import { OwnerDashboardLayout } from './owner-dashboard-layout'
import ModalLayout from '#components/ui/layout/modal-layout'
import type { ReactNode } from 'react'

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
