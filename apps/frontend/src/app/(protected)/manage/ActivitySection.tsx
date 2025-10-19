'use client'

import { ActivityFeed } from '@/components/dashboard/activity-feed'

/**
 * ActivitySection - Single Responsibility: Display recent activity
 *
 * Handles activity section layout - ActivityFeed component manages its own data
 */
export function ActivitySection() {
	return (
		<div className="rounded-lg border-2 border-border/50 bg-card hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
			<div
				className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent"
				style={{
					padding: 'var(--spacing-6) var(--spacing-6) var(--spacing-4)'
				}}
			>
				<h3
					className="font-bold simplified-mobile bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
					style={{
						fontSize: 'var(--font-title-2)',
						lineHeight: 'var(--line-height-title-2)',
						color: 'var(--color-label-primary)'
					}}
				>
					Recent Activity
				</h3>
				<p
					className="simplified-mobile"
					style={{
						color: 'var(--color-label-secondary)',
						fontSize: 'var(--font-body)',
						lineHeight: 'var(--line-height-body)',
						marginTop: 'var(--spacing-2)'
					}}
				>
					Latest updates across your properties
				</p>
			</div>
			<div
				style={{
					padding: 'var(--spacing-6)'
				}}
			>
				<ActivityFeed />
			</div>
		</div>
	)
}
