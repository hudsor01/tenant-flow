import './dashboard.css'
import type { ReactNode } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
	children
}: {
	children: ReactNode
}) {
	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			{/* Sticky Sidebar */}
			<AppSidebar variant="inset" />
			
			{/* Main Content Area */}
			<SidebarInset className="flex flex-col min-h-screen">
				{/* Sticky Header */}
				<SiteHeader className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b touch-manipulation" />
				
				{/* Scrollable Content Area */}
				<main className="flex-1 overflow-auto overscroll-contain scroll-smooth">
					<div className="@container/main flex flex-1 flex-col transform-gpu will-change-scroll">
						{children}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	)
}