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

	return (
		<main
			role="main"
			className="@container/main flex min-h-screen w-full flex-col bg-linear-to-br from-slate-50 via-white to-slate-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800/50"
		>
			<div className="border-b-2 border-slate-200/40 bg-linear-to-b from-white via-slate-50/30 to-slate-100/20 dark:border-slate-700/40 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20">
				<div className="mx-auto max-w-400 px-6 py-8">
					<h1 className="text-4xl font-black tracking-tight mb-8 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-white">
						Dashboard
					</h1>
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
			<div className="flex-1 p-8 py-10">
				<div className="mx-auto max-w-400 space-y-10">
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
