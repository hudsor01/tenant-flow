'use client'

import { ActivityFeedSkeleton } from '#components/dashboard/activity-feed-skeleton'
import { ErrorFallback } from '#components/ui/error-boundary/error-fallback'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { useOwnerDashboardData } from '#hooks/api/use-owner-dashboard'
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

// Use pre-defined activity classes from globals.css
const getActivityColorClass = (type: string): string => {
	const classMap: Record<string, string> = {
		payment: 'activity-payment',
		maintenance: 'activity-maintenance',
		lease: 'activity-lease',
		property: 'activity-property',
		tenant: 'activity-tenant'
	}
	return classMap[type] || 'text-muted-foreground bg-muted'
}

const getActivityBadgeClass = (type: string): string => {
	const classMap: Record<string, string> = {
		payment: 'activity-payment border border-[var(--color-success)]/20',
		maintenance: 'activity-maintenance border border-[var(--color-info)]/20',
		lease: 'activity-lease border border-[var(--color-primary)]/20',
		property: 'activity-property border border-[var(--color-primary)]/20',
		tenant: 'activity-tenant border border-[var(--color-warning)]/20'
	}
	return classMap[type] || 'text-muted-foreground bg-muted border-border'
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
	const { data, isLoading, error, refetch } = useOwnerDashboardData()

	// Extract activities array from the unified response
	const activities: ActivityWithEnum[] = React.useMemo(
		() => (data?.activity || []) as ActivityWithEnum[],
		[data?.activity]
	)

	if (isLoading) {
		return <ActivityFeedSkeleton items={4} />
	}

	if (error) {
		return (
			<ErrorFallback
				error={error as Error}
				title="Failed to load activities"
				description="Unable to load recent activities. Please try again."
				onRetry={() => void refetch()}
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
