'use client'

import { QuickActions } from '@/components/dashboard/quick-actions'

/**
 * QuickActionsSection - Single Responsibility: Display quick action shortcuts
 *
 * Handles quick actions section layout - QuickActions component manages its own logic
 */
export function QuickActionsSection() {
	return (
		<div className="rounded-lg border-2 border-border/50 bg-card hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
			<div className="border-b border-border/50 bg-gradient-to-r from-blue-500/5 to-transparent px-6 py-5">
				<h3 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
					Quick Actions
				</h3>
				<p className="text-sm text-muted-foreground mt-1.5">
					Common tasks and shortcuts
				</p>
			</div>
			<div className="p-6">
				<QuickActions />
			</div>
		</div>
	)
}
