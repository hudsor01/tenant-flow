import { Suspense } from 'react'
import { DashboardActivity } from '@/components/dashboard/dashboard-activity'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import {
	StatsCardSkeleton,
	ActivitySkeleton
} from '@/components/dashboard/dashboard-skeletons'

// Enable ISR with 60 second revalidation for better performance
export const revalidate = 60

// Enable dynamic rendering for authenticated content
export const dynamic = 'force-dynamic'

export default async function Page() {
	return (
		<div
			className="flex flex-1 flex-col"
			style={{
				gap: 'var(--spacing-4)',
				padding: 'var(--spacing-3) var(--spacing-3) 0'
			}}
		>
			{/* Stats Cards - Load in parallel with Suspense */}
			<Suspense fallback={<StatsCardSkeleton />}>
				<DashboardStats />
			</Suspense>

			{/* Activity and Charts - Load in parallel with Suspense */}
			<Suspense fallback={<ActivitySkeleton />}>
				<DashboardActivity />
			</Suspense>
		</div>
	)
}
