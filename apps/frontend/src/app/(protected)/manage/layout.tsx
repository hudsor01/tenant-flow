'use client'

import { AppSidebar } from '#components/dashboard/app-sidebar'
import { SiteHeader } from '#components/dashboard/site-header'
import { ViewTransitionsProvider } from '#providers/view-transitions-provider'
import { Breadcrumbs } from '#components/ui/breadcrumb'
import { SidebarInset, SidebarProvider } from '#components/ui/sidebar'
import { generateBreadcrumbs } from '#lib/breadcrumbs'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import '../dashboard.css'

export default function ManageLayout({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	const breadcrumbs = generateBreadcrumbs(pathname)

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
				<AppSidebar />
				<SidebarInset className="bg-muted/30">
					<SiteHeader />
					<div className="flex flex-1 flex-col">
						<div className="@container/main flex min-h-screen w-full flex-col p-6">
							<div className="mb-6">
								<Breadcrumbs items={breadcrumbs} />
							</div>
							{children}
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</ViewTransitionsProvider>
	)
}
