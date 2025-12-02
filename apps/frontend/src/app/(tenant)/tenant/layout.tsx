import { SiteHeader } from '#components/dashboard/site-header'
import { TenantSidebar } from '#components/dashboard/tenant-sidebar'
import { ViewTransitionsProvider } from '#providers/view-transitions-provider'
import { SidebarInset, SidebarProvider } from '#components/ui/sidebar'
import type { ReactNode } from 'react'

/**
 * Tenant Portal Layout
 *
 * Route protection is handled by proxy.ts using Supabase getClaims().
 * This layout is purely presentational - no auth guards needed.
 */
export default function TenantLayout({
	children,
	modal
}: {
	children: ReactNode
	modal?: ReactNode
}) {
	return (
		<ViewTransitionsProvider>
			<div className="min-h-screen bg-muted/50 p-4">
				<SidebarProvider
					style={
						{
							'--sidebar-width': 'calc(var(--spacing) * 72)',
							'--header-height': 'calc(var(--spacing) * 12)'
						} as React.CSSProperties
					}
				>
					<div className="flex h-[calc(100vh-2rem)] gap-(--spacing-4)">
						{/* Sidebar - 4 Separate Cards */}
						<div className="flex w-70 flex-col gap-(--spacing-4)">
							<TenantSidebar variant="inset" />
						</div>

						{/* Main Column */}
						<div className="flex flex-1 flex-col gap-(--spacing-4)">
							<SidebarInset>
								<SiteHeader />
								<div className="flex flex-1 flex-col rounded-xl border border-muted/200 bg-white p-6">
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
