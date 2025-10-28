'use client'

import { ActivityFeed } from '#components/dashboard/activity-feed'

/**
 * ActivitySection - Single Responsibility: Display recent activity
 *
 * Handles activity section layout - ActivityFeed component manages its own data
 */
export function ActivitySection() {
	return (
		<div className="rounded-lg border-2 border-border/50 bg-card hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
			<div className="border-b border-border/50 bg-linear-to-r from-primary/5 to-transparent px-6 pt-6 pb-4">
				<h3 className="font-bold simplified-mobile bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-xl leading-tight text-(--color-label-primary)">
					Recent Activity
				</h3>
				<p className="simplified-mobile text-(--color-label-secondary) text-sm leading-normal mt-2">
					Latest updates across your properties
				</p>
			</div>
			<div className="p-6">
				<ActivityFeed />
			</div>
		</div>
	)
}
