'use client'

import { SiteHeader } from '@/components/layout/site-header'
import { PageLoader } from '@/components/magicui/loading-spinner'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth-provider'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

import './dashboard.css'

export default function DashboardLayout({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading } = useAuthStore(state => ({
		isAuthenticated: state.isAuthenticated,
		isLoading: state.isLoading
	}))

	const router = useRouter()

	useEffect(() => {
		// Only redirect if auth state has loaded and user is not authenticated
		if (!isLoading && !isAuthenticated) {
			router.push('/login')
		}
	}, [isAuthenticated, isLoading, router])

	// Show loading while auth state is being determined
	if (isLoading) {
		return <PageLoader text="Authenticating..." />
	}

	// Show nothing while redirecting unauthenticated users
	if (!isAuthenticated) {
		return <PageLoader text="Redirecting to login..." />
	}

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
