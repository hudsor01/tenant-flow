'use client'

import { QuickActions } from '#components/dashboard/quick-actions'

/**
 * QuickActionsSection - Single Responsibility: Display quick action shortcuts
 *
 * Handles quick actions section layout - QuickActions component manages its own logic
 */
export function QuickActionsSection() {
	return (
		<section className="dashboard-panel" data-density="compact">
			<div className="dashboard-panel-header" data-variant="actions">
				<h3 className="dashboard-panel-title">Quick Actions</h3>
				<p className="dashboard-panel-description">
					Common tasks and shortcuts
				</p>
			</div>
			<div className="dashboard-panel-body">
				<QuickActions />
			</div>
		</section>
	)
}
