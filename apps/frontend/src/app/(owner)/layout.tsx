import { OwnerDashboardLayout } from './owner-dashboard-layout'
import type { ReactNode } from 'react'

/**
 * Owner Dashboard Layout (Next.js 16 Pattern)
 *
 * Auth Strategy:
 * - Proxy enforces auth and role validation
 * - This layout only renders UI components
 * - No auth checks needed (proxy guarantees OWNER role)
 */
export default function OwnerLayout({
	children
}: {
	children: ReactNode
}) {
	return <OwnerDashboardLayout>{children}</OwnerDashboardLayout>
}
