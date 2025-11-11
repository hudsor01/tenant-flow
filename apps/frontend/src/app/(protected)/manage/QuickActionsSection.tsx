'use client'

import { QuickActions } from '#components/dashboard/quick-actions'

/**
 * QuickActionsSection - Single Responsibility: Display quick action shortcuts
 *
 * Handles quick actions section layout - QuickActions component manages its own logic
 */
export function QuickActionsSection() {
	return (
		<div className="rounded-xl border-2 border-border bg-gradient-to-br from-background via-muted/30 to-card shadow-sm transition-all duration-500 hover:shadow-lg hover:border-border">
			<div className="border-b-2 border-border bg-gradient-to-r from-muted/50 via-background to-muted/50 px-6 py-6">
				<h3 className="text-xl font-black text-foreground tracking-tight">
					Quick Actions
				</h3>
				<p className="text-sm text-muted-foreground mt-2 font-medium">
					Common tasks and shortcuts
				</p>
			</div>
			<div className="p-6">
				<QuickActions />
			</div>
		</div>
	)
}
