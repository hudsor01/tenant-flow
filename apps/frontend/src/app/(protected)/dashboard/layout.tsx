import { SiteHeader } from '@/components/layout/site-header'
import { ViewTransitionsProvider } from '@/components/providers/view-transitions-provider'
import { AuthCheck } from '@/components/auth/auth-check'
import { SidebarWrapper } from '@/components/sidebar/sidebar-wrapper'
import type { ReactNode } from 'react'

import './dashboard.css'

// Server Component Layout with View Transitions
export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<AuthCheck>
			<ViewTransitionsProvider>
				<SidebarWrapper>
					<SiteHeader />
					<div className="flex flex-1 flex-col">{children}</div>
				</SidebarWrapper>
			</ViewTransitionsProvider>
		</AuthCheck>
	)
}