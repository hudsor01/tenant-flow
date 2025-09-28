'use client'

import { MetricsSection } from '@/components/dashboard-01/metrics-section'
import { ChartsSection } from '@/components/dashboard-01/charts-section'
import { ActivitySection } from '@/components/dashboard-01/activity-section'
import { PerformanceSection } from '@/components/dashboard-01/performance-section'
import { QuickActionsSection } from '@/components/dashboard-01/quick-actions-section'

export default function DashboardPage() {
	// Single responsibility: Pure layout orchestration
	// Each section handles its own data fetching and loading states

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			{/* Metrics Section - Single responsibility: Display key metrics */}
			<MetricsSection />

			{/* Main Content Area with Professional Grid Layout */}
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
					style={{ '--space-y': 'var(--dashboard-section-gap)' } as React.CSSProperties}
				>
					{/* Charts Section - Single responsibility: Financial visualizations */}
					<ChartsSection />

					{/* Two-Column Layout for Secondary Content */}
					<div
						className="grid lg:grid-cols-3"
						style={{ gap: 'var(--dashboard-section-gap)' }}
					>
						{/* Main Content Area - 2/3 Width */}
						<div
							className="lg:col-span-2"
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--dashboard-card-gap)'
							}}
						>
							{/* Activity Section - Single responsibility: Recent activity display */}
							<ActivitySection />

							{/* Performance Section - Single responsibility: Property performance data */}
							<PerformanceSection />
						</div>

						{/* Sidebar - 1/3 Width */}
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 'var(--dashboard-card-gap)'
							}}
						>
							{/* Quick Actions Section - Single responsibility: Action shortcuts */}
							<QuickActionsSection />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
