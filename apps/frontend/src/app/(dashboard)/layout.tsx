import { Suspense } from 'react'
import type { Metadata } from 'next/types'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'
import { QueryProvider } from '@/providers/query-provider'
import { PHProvider } from '@/providers/posthog-provider'
import { PostHogPageView } from '@/components/analytics/posthog-page-view'
import { PostHogUserProvider } from '@/components/analytics/posthog-user-provider'
import { PostHogErrorBoundary } from '@/components/analytics/posthog-error-boundary'
import { ServerAuthGuard } from '@/components/auth/server-auth-guard'
import { ProtectedRouteGuard } from '@/components/auth/protected-route-guard'
import { Navigation } from '@/components/dashboard/dashboard-navigation'
// Dashboard sidebar removed - using simpler layout
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
	modal: React.ReactNode // Parallel route for @modal
	sidebar: React.ReactNode // Parallel route for @sidebar
}

export default function DashboardLayout({
	children,
	modal,
	sidebar
}: DashboardLayoutProps) {
	return (
		<ServerAuthGuard requireAuth={true}>
			<PHProvider>
				<PostHogErrorBoundary>
					<QueryProvider>
						<PostHogUserProvider>
							<CommandPaletteProvider>
								<Suspense fallback={null}>
									<PostHogPageView />
								</Suspense>

								<ProtectedRouteGuard>
									<div className="min-h-screen bg-gray-50">
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
													<div className="hidden w-64 bg-white shadow-sm md:block" />
												}
											>
												<aside className="hidden w-64 bg-white shadow-sm md:block">
													{sidebar ?? (
														<div className="p-4">
															<p className="text-gray-500 text-sm">Navigation</p>
														</div>
													)}
												</aside>
											</Suspense>

											{/* Main content area - improved mobile spacing */}
											<main className="min-w-0 flex-1 pt-2 pb-20 md:p-6 md:pt-6 md:pb-6">
												<Suspense
													fallback={
														<div className="flex h-64 items-center justify-center">
															<Loader2 className="h-8 w-8 animate-spin" />
														</div>
													}
												>
													<div className="px-3 sm:px-4 md:px-0">
														{children}
													</div>
												</Suspense>
											</main>
										</div>

										{/* Modal parallel route */}
										{modal}
									</div>
								</ProtectedRouteGuard>
							</CommandPaletteProvider>
						</PostHogUserProvider>
					</QueryProvider>
				</PostHogErrorBoundary>
			</PHProvider>
		</ServerAuthGuard>
	)
}
