import { SiteHeader } from '#components/dashboard/site-header'
import { TenantSidebar } from '#components/dashboard/tenant-sidebar'
import { ViewTransitionsProvider } from '#providers/view-transitions-provider'
import { SidebarInset, SidebarProvider } from '#components/ui/sidebar'
import type { ReactNode } from 'react'

export default function TenantLayout({
	children,
	modal
}: {
	children: ReactNode
	modal?: ReactNode
}) {
	return (
		<ViewTransitionsProvider>
			<div className="min-h-screen bg-gray-50 p-4">
				<SidebarProvider
					style={
						{
							'--sidebar-width': 'calc(var(--spacing) * 72)',
							'--header-height': 'calc(var(--spacing) * 12)'
						} as React.CSSProperties
					}
				>
					<div className="flex h-[calc(100vh-2rem)] gap-4">
						{/* Sidebar - 4 Separate Cards */}
						<div className="flex w-70 flex-col gap-4">
							<TenantSidebar variant="inset" />
						</div>

						{/* Main Column */}
						<div className="flex flex-1 flex-col gap-4">
							<SidebarInset>
								<SiteHeader />
								<div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white p-6">
									<div className="@container/main flex flex-1 flex-col gap-2">
										{children}
									</div>
								</div>
							</SidebarInset>
						</div>
					</div>
				</SidebarProvider>
			</div>
			{modal}
		</ViewTransitionsProvider>
	)
}
