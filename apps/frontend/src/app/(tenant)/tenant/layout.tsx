import { SiteHeader } from '#components/dashboard/site-header'
import { TenantSidebar } from '#components/dashboard/tenant-sidebar'
import { SidebarInset, SidebarProvider } from '#components/ui/sidebar'
import type { ReactNode } from 'react'
import { TenantMobileNavWrapper } from './tenant-layout-client'

/**
 * Tenant Portal Layout
 *
 * Route protection is handled by proxy.ts using Supabase getClaims().
 * This layout is purely presentational - no auth guards needed.
 *
 * Responsive behavior:
 * - Desktop (md+): Shows sidebar navigation
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
		<div className="min-h-screen bg-muted/50 p-4 pb-20 md:pb-4">
			<SidebarProvider
				style={
					{
						'--sidebar-width': 'calc(var(--spacing) * 72)',
						'--header-height': 'calc(var(--spacing) * 12)'
					} as React.CSSProperties
				}
			>
				<div className="flex h-[calc(100vh-2rem)] gap-4 md:h-[calc(100vh-2rem)]">
					{/* Sidebar - Hidden on mobile, visible on md+ */}
					<div className="hidden w-70 flex-col gap-4 md:flex">
						<TenantSidebar variant="inset" />
					</div>

					{/* Main Column */}
					<div className="flex flex-1 flex-col gap-4">
						<SidebarInset>
							<SiteHeader />
							<div className="flex flex-1 flex-col rounded-xl border border-muted/200 bg-white p-4 md:p-6">
								<div className="@container/main flex flex-1 flex-col gap-2">
									{children}
								</div>
							</div>
						</SidebarInset>
					</div>
				</div>
			</SidebarProvider>

			{/* Mobile Bottom Navigation - Visible on mobile only */}
			<TenantMobileNavWrapper />

			{modal}
		</div>
	)
}
