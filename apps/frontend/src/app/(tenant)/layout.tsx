import { TenantDashboardLayout } from './tenant-dashboard-layout'
import type { ReactNode } from 'react'

/**
 * Tenant Portal Layout (Next.js 16 Pattern)
 *
 * Auth Strategy:
 * - Proxy enforces auth and role validation
 * - This layout only renders UI components
 * - No auth checks needed (proxy guarantees TENANT role)
 *
 * Layout:
 * - Uses AppSidebar (same as owner dashboard)
 * - Visible logout button in sidebar
 * - Desktop-first with responsive mobile support
 */
export default function TenantLayout({
	children
}: {
	children: ReactNode
}) {
	return <TenantDashboardLayout>{children}</TenantDashboardLayout>
}
