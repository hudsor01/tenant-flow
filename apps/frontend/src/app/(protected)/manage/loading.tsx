import { AppSidebar } from '@/components/dashboard-01/app-sidebar'
import { SiteHeader } from '@/components/dashboard-01/site-header'
import { LoadingSpinner } from '@/components/magicui/loading-spinner'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function DashboardLoading() {
	return (
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
						<div className="flex h-[500px] w-full items-center justify-center">
							<LoadingSpinner text="Loading dashboard..." size="lg" />
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
