'use client'

import { ActivityFeed } from '#components/dashboard/activity-feed'

/**
 * ActivitySection - Single Responsibility: Display recent activity
 *
 * Handles activity section layout - ActivityFeed component manages its own data
 */
export function ActivitySection() {
	return (
		<section className="dashboard-panel" data-density="compact">
			<div className="dashboard-panel-header" data-variant="activity">
				<h3 className="dashboard-panel-title">Recent Activity</h3>
				<p className="dashboard-panel-description">
					Latest updates across your properties
				</p>
			</div>
			<div className="dashboard-panel-body">
				<ActivityFeed />
			</div>
		</section>
	)
}
