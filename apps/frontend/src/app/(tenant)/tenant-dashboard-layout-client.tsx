'use client'

import { TenantSidebar } from '#components/dashboard/tenant-sidebar'
import { SiteHeader } from '#components/dashboard/site-header'
import { Breadcrumbs } from '#components/ui/breadcrumb'
import { SidebarInset } from '#components/ui/sidebar'
import { generateBreadcrumbs } from '#lib/breadcrumbs'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function TenantDashboardLayoutClient({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	const breadcrumbs = generateBreadcrumbs(pathname)

	return (
		<>
			<div className="flex h-full flex-col gap-[var(--layout-gap-items)] p-[var(--layout-gap-items)]">
				<TenantSidebar />
			</div>
			<SidebarInset className="dashboard-root bg-muted/30">
				<SiteHeader />
				<div className="dashboard-main flex-1">
					<div className="@container/main dashboard-content p-[var(--layout-content-padding)]">
						<nav className="mb-[var(--layout-gap-group)]">
							<Breadcrumbs items={breadcrumbs} />
						</nav>
						{children}
					</div>
				</div>
			</SidebarInset>
		</>
	)
}