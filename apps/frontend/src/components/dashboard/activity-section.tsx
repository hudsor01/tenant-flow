'use client'

import { ActivityFeed } from '#components/dashboard/activity-feed'
import { DashboardSection } from '#components/dashboard/dashboard-section'

/**
 * ActivitySection - Display recent activity
 *
 * Uses DashboardSection for consistent layout - ActivityFeed manages its own data
 */
export function ActivitySection() {
	return (
		<DashboardSection
			title="Recent Activity"
			description="Latest updates across your properties"
			variant="activity"
			density="compact"
		>
			<ActivityFeed />
		</DashboardSection>
	)
}
