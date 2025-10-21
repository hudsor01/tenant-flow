import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { SiteHeader } from '@/components/dashboard/site-header'
import { ViewTransitionsProvider } from '@/components/providers/view-transitions-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import type { ReactNode } from 'react'

export default function ManageLayout({ children }: { children: ReactNode }) {
	return (
		<ViewTransitionsProvider>
			<SidebarProvider
				style={
					{
						'--sidebar-width': 'calc(var(--spacing) * 72)',
						'--header-height': 'calc(var(--spacing) * 12)'
					} as React.CSSProperties
				}
			>
				<AppSidebar variant="inset" />
				<SidebarInset>
					<SiteHeader />
					<div className="flex flex-1 flex-col">
						<div className="@container/main flex flex-1 flex-col gap-2">
							{children}
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</ViewTransitionsProvider>
	)
}
