'use client'

import { ActivityFeed } from '@/components/dashboard-01/activity-feed'

/**
 * ActivitySection - Single Responsibility: Display recent activity
 *
 * Handles activity section layout - ActivityFeed component manages its own data
 */
export function ActivitySection() {
	return (
		<div className="rounded-lg border bg-card">
			<div
				className="border-b"
				style={{
					padding: 'var(--spacing-6) var(--spacing-6) var(--spacing-4)'
				}}
			>
				<h3
					className="font-semibold simplified-mobile"
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
						marginTop: 'var(--spacing-1)'
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
