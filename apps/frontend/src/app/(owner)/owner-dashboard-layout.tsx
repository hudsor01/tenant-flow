import { AppSidebar } from '#components/dashboard/app-sidebar'
import { ServerSidebarProvider } from '#components/ui/server-sidebar-provider'
import { OwnerDashboardLayoutClient } from './owner-dashboard-layout-client'
import type { ReactNode } from 'react'
import './dashboard.css'

export async function OwnerDashboardLayout({ children }: { children: ReactNode }) {
	return (
		<ServerSidebarProvider
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 72)',
					'--header-height': 'calc(var(--spacing) * 12)'
				} as React.CSSProperties
			}
		>
			<AppSidebar />
			<OwnerDashboardLayoutClient>{children}</OwnerDashboardLayoutClient>
		</ServerSidebarProvider>
	)
}
