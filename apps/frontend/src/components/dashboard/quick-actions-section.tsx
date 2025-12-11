'use client'

import { QuickActions } from '#components/dashboard/quick-actions'
import { DashboardSection } from '#components/dashboard/dashboard-section'

/**
 * QuickActionsSection - Display quick action shortcuts
 *
 * Uses DashboardSection for consistent layout - QuickActions component manages its own logic
 */
export function QuickActionsSection() {
	return (
		<DashboardSection
			title="Quick Actions"
			description="Common tasks and shortcuts"
			variant="actions"
			density="compact"
			tourId="quick-actions"
		>
			<QuickActions />
		</DashboardSection>
	)
}
