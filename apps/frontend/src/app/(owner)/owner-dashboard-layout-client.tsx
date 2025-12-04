'use client'

import { SiteHeader } from '#components/dashboard/site-header'
import { Breadcrumbs } from '#components/ui/breadcrumb'
import { SidebarInset } from '#components/ui/sidebar'
import { generateBreadcrumbs } from '#lib/breadcrumbs'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function OwnerDashboardLayoutClient({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	const breadcrumbs = generateBreadcrumbs(pathname)

	return (
		<SidebarInset className="dashboard-root bg-muted/30">
			<SiteHeader />
			<div className="dashboard-main flex-1">
				<div className="@container/main dashboard-content p-[var(--layout-content-padding)]">
					<nav className="mb-[var(--layout-gap-group)] border-b border-border/50 pb-[var(--layout-gap-items)]">
						<Breadcrumbs items={breadcrumbs} />
					</nav>
					{children}
				</div>
			</div>
		</SidebarInset>
	)
}