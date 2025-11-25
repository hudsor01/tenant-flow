'use client'

import { ActivityFeedSkeleton } from '#components/dashboard/activity-feed-skeleton'
import { ErrorFallback } from '#components/error-boundary/error-fallback'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { useOwnerDashboardActivity } from '#hooks/api/use-owner-dashboard'
import { useCategoryLoading } from '#hooks/use-loading'
import { cn } from '#lib/utils'
import type { Activity } from '@repo/shared/types/activity'
import type { ActivityEntityType } from '@repo/shared/types/core'
import { formatDistanceToNow } from 'date-fns'
import {
	CheckCircle,
	Clock,
	DollarSign,
	Home,
	User,
	Wrench
} from 'lucide-react'
import React from 'react'

// Type assertion to handle Supabase entityType as enum
type ActivityWithEnum = Omit<Activity, 'entityType'> & {
	entityType: ActivityEntityType
}

// Inline helpers using CSS classes from globals.css
const getActivityColorClass = (type: string): string => {
	const colorMap: Record<string, string> = {
		payment: 'text-[var(--color-success)] bg-[var(--color-success)]/10',
		maintenance: 'text-[var(--color-info)] bg-[var(--color-info)]/10',
		lease: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10',
		property: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10',
		tenant: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10'
	}
	return colorMap[type] || 'text-muted-foreground bg-muted'
}

const getActivityBadgeClass = (type: string): string => {
	const colorMap: Record<string, string> = {
		payment: 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20',
		maintenance: 'text-[var(--color-info)] bg-[var(--color-info)]/10 border-[var(--color-info)]/20',
		lease: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20',
		property: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20',
		tenant: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20'
	}
	return colorMap[type] || 'text-muted-foreground bg-muted border-border'
}

// Modern helpers - assume valid inputs
const formatDate = (date: string | Date): string => {
	const dateObj = new Date(date)
	return formatDistanceToNow(dateObj, { addSuffix: true })
}

const safeEntityDisplay = (
	entityName: string | null,
	entityId: string | null
): string => {
	if (entityName) {
		return `${entityName} (${entityId || 'Unknown ID'})`
	}
	return entityId || 'Unknown Entity'
}

const getActivityBadge = (type: string) => {
	const labels = {
		payment: 'Payment',
		maintenance: 'Maintenance',
		lease: 'Lease',
		property: 'Property',
		tenant: 'Tenant'
	}

	return (
		<Badge variant="outline" className={getActivityBadgeClass(type)}>
			{labels[type as keyof typeof labels] || 'Activity'}
		</Badge>
	)
}

const getIconForType = (type: string) => {
	switch (type) {
		case 'payment':
			return DollarSign
		case 'maintenance':
			return Wrench
		case 'leases':
			return CheckCircle
		case 'properties':
			return Home
		case 'tenants':
			return User
		default:
			return Clock
	}
}

export const ActivityFeed = React.memo(function ActivityFeed() {
	const { data, isLoading, error } = useOwnerDashboardActivity()
	const { startLoading, stopLoading, isLoading: isGlobalLoading } = useCategoryLoading('dashboard')

	// Sync React Query loading state with global loading store
	// React 19: Dependency on isLoading ensures we only update when loading state actually changes
	React.useEffect(() => {
		if (isLoading) {
			startLoading('Loading recent activities...')
		} else {
			stopLoading()
		}
	}, [isLoading, startLoading, stopLoading])

	// Extract activities array from the response and cast to proper enum type
	const activities: ActivityWithEnum[] = React.useMemo(
		() => (data?.activities || []) as ActivityWithEnum[],
		[data?.activities]
	)

	if (isGlobalLoading) {
		return <ActivityFeedSkeleton items={4} />
	}

	if (error) {
		return (
			<ErrorFallback
				error={error as Error}
				title="Failed to load activities"
				description="Unable to load recent activities. Please try again."
				onRetry={() => window.location.reload()}
			/>
		)
	}

	if (!activities || activities.length === 0) {
		return (
			<div className="dashboard-activity-empty">
				<p className="text-sm font-medium text-muted-foreground">
					No recent activities
				</p>
				<p className="text-xs text-muted-foreground">
					Workflow updates will appear here as they happen.
				</p>
			</div>
		)
	}

	return (
		<div className="dashboard-activity-feed">
			{activities.map((activity: ActivityWithEnum) => {
				// Null-safe icon retrieval with fallback
				const Icon = getIconForType(activity.entityType) ?? Clock

				return (
					<div
						key={activity.id}
						className="dashboard-activity-item"
					>
						{/* Activity Icon */}
						<div
							className={cn(
								'dashboard-activity-icon',
								getActivityColorClass(activity.entityType)
							)}
						>
							<Icon className="size-4" aria-hidden="true" />
						</div>

						{/* Activity Content */}
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<p className="dashboard-activity-title">{activity.action}</p>
								{getActivityBadge(activity.entityType)}
							</div>
							<p className="dashboard-activity-entity">
								{safeEntityDisplay(activity.entityName, activity.entityId)}
							</p>
							<div className="dashboard-activity-meta">
								<Clock className="size-3" aria-hidden="true" />
								{formatDate(activity.created_at)}
							</div>
						</div>
					</div>
				)
			})}

			{/* View All Activities Button */}
			<div className="dashboard-activity-footer">
				<Button variant="outline" className="w-full min-h-11">
					View All Activities
				</Button>
			</div>
		</div>
	)
})
