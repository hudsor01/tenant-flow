import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { SiteHeader } from '@/components/dashboard/site-header'
import { ViewTransitionsProvider } from '@/components/providers/view-transitions-provider'
import type { ReactNode } from 'react'

export default function ManageLayout({ children }: { children: ReactNode }) {
	return (
		<ViewTransitionsProvider>
			<div className="flex h-screen w-full overflow-hidden">
				{/* Sidebar - Fixed width */}
				<aside className="w-64 shrink-0 border-r border-border">
					<AppSidebar />
				</aside>

				{/* Main Content - Flexes to fill remaining width */}
				<main className="flex-1 overflow-y-auto">
					{/* Header */}
					<div className="border-b border-border bg-background">
						<SiteHeader />
					</div>

					{/* Page Content */}
					<div className="flex-1 p-6">{children}</div>
				</main>
			</div>
		</ViewTransitionsProvider>
	)
}
