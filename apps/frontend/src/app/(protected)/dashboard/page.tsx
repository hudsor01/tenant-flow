import { getDashboardData } from '@/app/actions/dashboard'
import { ActivitySection } from '@/components/dashboard-01/activity-section'
import { ChartsSection } from '@/components/dashboard-01/charts-section'
import { PerformanceSection } from '@/components/dashboard-01/performance-section'
import { QuickActionsSection } from '@/components/dashboard-01/quick-actions-section'
import { SectionCards } from '@/components/dashboard-01/section-cards'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
	const result = await getDashboardData()

	if (!result.success) {
		if ('shouldRedirect' in result && result.shouldRedirect) {
			redirect(result.shouldRedirect)
		}
		// Show error state or redirect to error page
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p className="text-muted-foreground">
					Failed to load dashboard data. Please try again.
				</p>
			</div>
		)
	}

	const dashboardData = result.data
	const stats = dashboardData?.stats

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<div
				className="border-b bg-background"
				style={{
					padding: 'var(--dashboard-content-padding)',
					borderColor: 'var(--color-fill-tertiary)'
				}}
			>
				<div
					className="mx-auto max-w-[1600px]"
					style={{
						paddingTop: 'var(--spacing-4)',
						paddingBottom: 'var(--spacing-4)'
					}}
				>
					<SectionCards stats={stats} />
				</div>
			</div>
			<div
				className="flex-1"
				style={{
					padding: 'var(--dashboard-content-padding)',
					paddingTop: 'var(--dashboard-section-gap)',
					paddingBottom: 'var(--dashboard-section-gap)'
				}}
			>
				<div
					className="mx-auto max-w-[1600px] space-y-8"
					style={
						{
							'--space-y': 'var(--dashboard-section-gap)'
						} as React.CSSProperties
					}
				>
					<ChartsSection />

					<div
						className="grid lg:grid-cols-3"
						style={{ gap: 'var(--dashboard-section-gap)' }}
					>
						<div
							className="lg:col-span-2"
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--dashboard-card-gap)'
							}}
						>
							<ActivitySection />

							<PerformanceSection />
						</div>

						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--dashboard-card-gap)'
							}}
						>
							<QuickActionsSection />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
