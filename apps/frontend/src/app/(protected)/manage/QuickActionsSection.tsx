'use client'

import { QuickActions } from '@/components/dashboard-01/quick-actions'

/**
 * QuickActionsSection - Single Responsibility: Display quick action shortcuts
 *
 * Handles quick actions section layout - QuickActions component manages its own logic
 */
export function QuickActionsSection() {
	return (
		<div className="rounded-lg border bg-card">
			<div className="border-b px-6 py-4">
				<h3 className="text-lg font-semibold">Quick Actions</h3>
			</div>
			<div className="p-6">
				<QuickActions />
			</div>
		</div>
	)
}
