"use client"

import { AppSidebar } from '@/components/sidebar/app-sidebar'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth-provider'
import { PageLoader } from '@/components/magicui/loading-spinner'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

export default function ProtectedLayout({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading } = useAuthStore(state => ({
		isAuthenticated: state.isAuthenticated,
		isLoading: state.isLoading
	}))

	const router = useRouter()

	useEffect(() => {
		// Only redirect if auth state has loaded and user is not authenticated
		if (!isLoading && !isAuthenticated) {
			router.push('/auth/login')
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

	// Render protected content with sidebar for authenticated users
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className="hidden md:block" />
								<BreadcrumbItem>
									<BreadcrumbPage>Property Management</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				</header>
				{children}
			</SidebarInset>
		</SidebarProvider>
	)
}
