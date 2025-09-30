'use client'

import { ActivitySection } from '@/components/dashboard-01/activity-section'
import { ChartsSection } from '@/components/dashboard-01/charts-section'
import { SectionCards } from '@/components/dashboard-01/section-cards'
import { PerformanceSection } from '@/components/dashboard-01/performance-section'
import { QuickActionsSection } from '@/components/dashboard-01/quick-actions-section'

export default function DashboardPage() {

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
					<SectionCards />
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
					style={{ '--space-y': 'var(--dashboard-section-gap)' } as React.CSSProperties}
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
