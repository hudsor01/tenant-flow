'use client'

import { ErrorFallback } from '#components/error-boundary/error-fallback'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Spinner } from '#components/ui/spinner'
import { useDashboardActivity } from '#hooks/api/use-dashboard'
import {
	getActivityBadgeClass,
	getActivityColorClass
} from '#lib/utils/color-helpers'
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

// Type assertion to handle Supabase entityType as enum
type ActivityWithEnum = Omit<Activity, 'entityType'> & {
	entityType: ActivityEntityType
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
		case 'lease':
			return CheckCircle
		case 'property':
			return Home
		case 'tenant':
			return User
		default:
			return Clock
	}
}

export function ActivityFeed() {
	const { data, isLoading, error } = useDashboardActivity()

	// Extract activities array from the response and cast to proper enum type
	const activities: ActivityWithEnum[] = (data?.activities || []) as ActivityWithEnum[]

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Spinner className="size-6 animate-spin" />
				<span className="ml-2 text-muted-foreground text-body-md">
					Loading activities...
				</span>
			</div>
		)
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
			<div className="text-center py-8">
				<p className="text-sm text-muted-foreground">No recent activities</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{activities.map((activity: ActivityWithEnum) => {
				// Null-safe icon retrieval with fallback
				const Icon = getIconForType(activity.entityType) ?? Clock

				return (
					<div
						key={activity.id}
						className="flex items-start gap-4 p-3 rounded-lg hover:bg-(--color-muted) transition-colors duration-200"
					>
						{/* Activity Icon */}
						<div
							className={
								getActivityColorClass(activity.entityType) +
								' flex size-10 items-center justify-center rounded-full border border-(--color-border)'
							}
						>
							<Icon className="size-4" />
						</div>

						{/* Activity Content */}
						<div className="min-w-0 flex-1">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 mb-2">
										<p className="font-medium text-(--color-label-primary) text-body-md">
											{activity.action}
										</p>
										{getActivityBadge(activity.entityType)}
									</div>
									<p className="mb-2 text-(--color-label-secondary) text-body-md">
										{safeEntityDisplay(activity.entityName, activity.entityId)}
									</p>
									<div className="flex items-center gap-2">
										<span className="flex items-center gap-1 text-(--color-label-tertiary) text-body-xs">
											<Clock className="size-3" />
											{formatDate(activity.createdAt)}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				)
			})}

			{/* View All Activities Button */}
			<div className="pt-4 border-t">
				<Button variant="outline" className="w-full">
					View All Activities
				</Button>
			</div>
		</div>
	)
}
