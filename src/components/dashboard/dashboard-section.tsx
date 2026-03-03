'use client'

import { useId, type ReactNode } from 'react'

/**
 * Dashboard section variants for header styling
 */
export type DashboardSectionVariant = 'activity' | 'performance' | 'actions'

/**
 * Dashboard section density options
 */
export type DashboardSectionDensity = 'compact' | 'comfortable'

/**
 * DashboardSection Props
 */
export interface DashboardSectionProps {
	/** Section title displayed in the header */
	title: string
	/** Section description displayed below the title */
	description: string
	/** Content to render in the section body */
	children: ReactNode
	/** Header variant for styling differentiation */
	variant?: DashboardSectionVariant
	/** Data density mode */
	density?: DashboardSectionDensity
	/** Tour ID for onboarding integration */
	tourId?: string
}

/**
 * DashboardSection - Unified section component for dashboard panels
 *
 * Replaces: activity-section, performance-section, quick-actions-section
 *
 * Uses composition pattern - children manage their own data fetching.
 *
 * @example
 * ```tsx
 * <DashboardSection
 *   title="Recent Activity"
 *   description="Latest updates across your properties"
 *   variant="activity"
 *   density="compact"
 * >
 *   <ActivityFeed />
 * </DashboardSection>
 * ```
 */
export function DashboardSection({
	title,
	description,
	children,
	variant,
	density,
	tourId
}: DashboardSectionProps) {
	const titleId = useId()

	return (
		<section
			className="dashboard-panel"
			aria-labelledby={titleId}
			{...(density && { 'data-density': density })}
			{...(tourId && { 'data-tour': tourId })}
		>
			<div
				className="dashboard-panel-header"
				{...(variant && { 'data-variant': variant })}
			>
				<h3 id={titleId} className="dashboard-panel-title">
					{title}
				</h3>
				<p className="dashboard-panel-description">{description}</p>
			</div>
			<div className="dashboard-panel-body">{children}</div>
		</section>
	)
}
