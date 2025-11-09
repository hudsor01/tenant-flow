import { requireSession } from '#lib/server-auth'
import { ErrorBoundary } from '#components/ui/error-boundary'
import { ActivitySection } from './ActivitySection'
import { ChartsSection } from './ChartsSection'
import { PerformanceSection } from './PerformanceSection'
import { QuickActionsSection } from './QuickActionsSection'
import { SectionCards } from './SectionCards'
import { TrendsSection } from './TrendsSection'

export default async function DashboardPage() {
	// ✅ Server-side auth - NO client flash, instant 307 redirect
	await requireSession()

	// Stats are now fetched client-side via TanStack Query in SectionCards
	// No server-side fetching needed - enables real-time updates with refetchInterval

	return (
		<main
			role="main"
			className="@container/main flex min-h-screen w-full flex-col"
		>
			<div className="border-b bg-linear-to-b from-background to-muted/20">
				<div className="mx-auto max-w-400 px-6 py-6">
					<h1 className="text-3xl font-bold tracking-tight mb-6">Dashboard</h1>
					<div data-testid="dashboard-stats">
						<ErrorBoundary
							fallback={
								<div className="rounded-xl border bg-card p-5">
									<p className="text-sm text-muted-foreground">
										Unable to load dashboard stats
									</p>
								</div>
							}
						>
							<SectionCards />
						</ErrorBoundary>
					</div>
				</div>
			</div>
			<div className="flex-1 p-6 py-6">
				<div className="mx-auto max-w-400 space-y-8">
					<ErrorBoundary
						fallback={
							<div className="rounded-xl border bg-card p-5">
								<p className="text-sm text-muted-foreground">
									Unable to load trends section
								</p>
							</div>
						}
					>
						<TrendsSection />
					</ErrorBoundary>

					<ErrorBoundary
						fallback={
							<div className="rounded-xl border bg-card p-5">
								<p className="text-sm text-muted-foreground">
									Unable to load charts section
								</p>
							</div>
						}
					>
						<ChartsSection />
					</ErrorBoundary>

					<div className="grid lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2 flex flex-col gap-4">
							<ErrorBoundary
								fallback={
									<div className="rounded-xl border bg-card p-5">
										<p className="text-sm text-muted-foreground">
											Unable to load activity feed
										</p>
									</div>
								}
							>
								<ActivitySection />
							</ErrorBoundary>

							<ErrorBoundary
								fallback={
									<div className="rounded-xl border bg-card p-5">
										<p className="text-sm text-muted-foreground">
											Unable to load performance section
										</p>
									</div>
								}
							>
								<PerformanceSection />
							</ErrorBoundary>
						</div>

						<div className="flex flex-col gap-4">
							<ErrorBoundary
								fallback={
									<div className="rounded-xl border bg-card p-5">
										<p className="text-sm text-muted-foreground">
											Unable to load quick actions
										</p>
									</div>
								}
							>
								<QuickActionsSection />
							</ErrorBoundary>
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}