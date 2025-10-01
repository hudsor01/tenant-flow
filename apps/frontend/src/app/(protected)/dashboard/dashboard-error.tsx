'use client'

import { AppSidebar } from '@/components/dashboard-01/app-sidebar'
import { SiteHeader } from '@/components/dashboard-01/site-header'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

const logger = createLogger({ component: 'DashboardError' })

export default function DashboardError({
	error,
	reset
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		logger.error('Dashboard error occurred', {
			action: 'dashboard_error_boundary_triggered',
			metadata: { message: error.message, digest: error.digest }
		})
	}, [error])

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
							<div className="flex max-w-md flex-col items-center gap-4 text-center">
								<AlertCircle className="size-12 text-destructive" />
								<div className="space-y-2">
									<h2 className="text-xl font-semibold">Dashboard Error</h2>
									<p className="text-sm text-muted-foreground">
										There was a problem loading the dashboard data. Please try
										refreshing.
									</p>
								</div>
								<Button onClick={reset} variant="outline" size="sm">
									Retry
								</Button>
							</div>
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
