import { TenantSidebar } from '#components/dashboard/tenant-sidebar'
import { ServerSidebarProvider } from '#components/ui/server-sidebar-provider'
import { TenantDashboardLayoutClient } from '../tenant-dashboard-layout-client'
import type { ReactNode } from 'react'
import { TenantMobileNavWrapper } from './tenant-layout-client'
import '../../(owner)/dashboard.css'

/**
 * Tenant Portal Layout
 *
 * Route protection is handled by proxy.ts using Supabase getClaims().
 * This layout is purely presentational - no auth guards needed.
 *
 * Responsive behavior:
 * - Desktop (md+): Shows sidebar navigation with full-width content
 * - Mobile (<md): Hides sidebar, shows bottom navigation bar
 */
export default function TenantLayout({
	children,
	modal
}: {
	children: ReactNode
	modal?: ReactNode
}) {
	return (
		<ServerSidebarProvider
			style={{
				'--sidebar-width': 'calc(var(--spacing) * 72)',
				'--header-height': 'calc(var(--spacing) * 12)'
			} as React.CSSProperties}
		>
			<TenantSidebar />
			<TenantDashboardLayoutClient>{children}</TenantDashboardLayoutClient>

			{/* Mobile Bottom Navigation - Visible on mobile only */}
			<TenantMobileNavWrapper />

			{modal}
		</ServerSidebarProvider>
	)
}
