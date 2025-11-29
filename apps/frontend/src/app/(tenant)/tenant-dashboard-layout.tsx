import { ServerSidebarProvider } from '#components/ui/server-sidebar-provider'
import { TenantDashboardLayoutClient } from './tenant-dashboard-layout-client'
import type { ReactNode } from 'react'
import '../(owner)/dashboard.css'

export async function TenantDashboardLayout({ children }: { children: ReactNode }) {
	return (
		<ServerSidebarProvider
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 72)',
					'--header-height': 'calc(var(--spacing) * 12)'
				} as React.CSSProperties
			}
		>
			<TenantDashboardLayoutClient>{children}</TenantDashboardLayoutClient>
		</ServerSidebarProvider>
	)
}
