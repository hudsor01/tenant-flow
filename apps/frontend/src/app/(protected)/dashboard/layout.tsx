import type { ReactNode } from 'react'

import './dashboard.css'

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<SidebarProvider
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 72)',
					'--header-height': 'calc(var(--spacing) * 12)'
				} as React.CSSProperties
			}
		>
			{/* Sticky Sidebar */}
			<AppSidebar variant="inset" />

			{/* Main Content Area */}
			<SidebarInset className="dashboard-root flex flex-col min-h-screen">
				{/* Sticky Header */}
				<SiteHeader className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b touch-manipulation" />

				{/* Scrollable Content Area */}
				<main className="dashboard-main flex-1 overflow-auto overscroll-contain scroll-smooth">
					<div className="@container/main flex flex-1 flex-col transform-gpu will-change-scroll">
						{children}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	)
}
