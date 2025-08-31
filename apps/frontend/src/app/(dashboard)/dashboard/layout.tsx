import { Suspense } from 'react'
import type { Metadata } from 'next/types'
import { PostHogPageView } from '@/components/analytics/posthog-page-view'
import { ServerAuthGuard } from '@/components/auth/server-auth-guard'
import { AuthGuardCore, AuthLoadingState } from '@/components/auth/protected-route-guard'
import { Navigation } from '@/components/dashboard/dashboard-navigation'
import { OfflineBanner } from '@/components/ui/offline-indicator'
import { Loader2 } from 'lucide-react'
export const metadata: Metadata = {
	title: {
		template: '%s | Dashboard - TenantFlow',
		default: 'Dashboard - TenantFlow'
	},
	description:
		'Property management dashboard for landlords and property managers.',
	robots: { index: false, follow: false } // Private area
}

interface DashboardLayoutProps {
	children: React.ReactNode
}

/**
 * Simplified dashboard layout - ALL providers moved to root
 * Only auth guards and UI structure here (KISS principle)
 */
export default function DashboardLayout({
	children
}: DashboardLayoutProps) {
	return (
		<ServerAuthGuard requireAuth={true}>
			<Suspense fallback={null}>
				<PostHogPageView />
			</Suspense>

			<AuthGuardCore
				mode="protect"
				redirectTo="/auth/login"
				fallback={<AuthLoadingState message="Checking authentication..." />}
				redirectingMessage="Redirecting to login..."
				requireAuth={true}
			>
				<div className="min-h-screen bg-base2">
					{/* Offline Banner */}
					<OfflineBanner />

					{/* Mobile-First Navigation */}
					<div className="md:hidden">
						<Navigation className="border-b" />
					</div>

					{/* Desktop Navigation */}
					<div className="hidden md:block">
						<Navigation />
					</div>

					<div className="flex">
						{/* Desktop Sidebar */}
						<Suspense
							fallback={
								<div className="hidden w-64 bg-card shadow-sm md:block" />
							}
						>
							<aside className="hidden w-64 bg-card shadow-sm md:block">
								<div className="p-4">
									<p className="text-sm text-muted-foreground">
										Navigation
									</p>
								</div>
							</aside>
						</Suspense>

						{/* Main content area */}
						<main className="min-w-0 flex-1 pb-20 pt-2 md:p-6 md:pb-6 md:pt-6">
							<Suspense
								fallback={
									<div className="flex h-64 items-center justify-center">
										<Loader2 className=" h-8 w-8 animate-spin" />
									</div>
								}
							>
								<div className="px-3 sm:px-4 md:px-0">
									{children}
								</div>
							</Suspense>
						</main>
					</div>
				</div>
			</AuthGuardCore>
		</ServerAuthGuard>
	)
}