'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	CheckCircle,
	Clock,
	DollarSign,
	Home,
	User,
	Wrench,
	Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useDashboardActivity } from '@/hooks/api/use-dashboard'
import type { Tables } from '@repo/shared'

type Activity = Tables<'Activity'>

const getActivityBadge = (type: string) => {
	const badgeStyles = {
		payment: {
			color: 'var(--color-metric-success)',
			backgroundColor: 'var(--color-metric-success-bg)',
			borderColor: 'var(--color-metric-success-border)'
		},
		maintenance: {
			color: 'var(--color-metric-info)',
			backgroundColor: 'var(--color-metric-info-bg)',
			borderColor: 'var(--color-metric-info-border)'
		},
		lease: {
			color: 'var(--color-metric-primary)',
			backgroundColor: 'var(--color-metric-primary-bg)',
			borderColor: 'var(--color-metric-primary-border)'
		},
		property: {
			color: 'var(--color-metric-revenue)',
			backgroundColor: 'var(--color-metric-revenue-bg)',
			borderColor: 'var(--color-metric-revenue-border)'
		},
		tenant: {
			color: 'var(--color-metric-warning)',
			backgroundColor: 'var(--color-metric-warning-bg)',
			borderColor: 'var(--color-metric-warning-border)'
		}
	}

	const style = badgeStyles[type as keyof typeof badgeStyles] || {
		color: 'var(--color-metric-neutral)',
		backgroundColor: 'var(--color-metric-neutral-bg)',
		borderColor: 'var(--color-metric-neutral-border)'
	}

	const labels = {
		payment: 'Payment',
		maintenance: 'Maintenance',
		lease: 'Lease',
		property: 'Property',
		tenant: 'Tenant'
	}

	return (
		<Badge variant="outline" style={style}>
			{labels[type as keyof typeof labels] || 'Activity'}
		</Badge>
	)
}

const getIconForType = (type: string) => {
	switch (type) {
		case 'payment': return DollarSign
		case 'maintenance': return Wrench
		case 'lease': return CheckCircle
		case 'property': return Home
		case 'tenant': return User
		default: return Clock
	}
}

const getColorForType = (type: string) => {
	const colorMap = {
		payment: {
			color: 'var(--color-metric-success)',
			bgColor: 'var(--color-metric-success-bg)'
		},
		maintenance: {
			color: 'var(--color-metric-info)',
			bgColor: 'var(--color-metric-info-bg)'
		},
		lease: {
			color: 'var(--color-metric-primary)',
			bgColor: 'var(--color-metric-primary-bg)'
		},
		property: {
			color: 'var(--color-metric-revenue)',
			bgColor: 'var(--color-metric-revenue-bg)'
		},
		tenant: {
			color: 'var(--color-metric-warning)',
			bgColor: 'var(--color-metric-warning-bg)'
		}
	}

	return colorMap[type as keyof typeof colorMap] || {
		color: 'var(--color-metric-neutral)',
		bgColor: 'var(--color-metric-neutral-bg)'
	}
}

export function ActivityFeed() {
	const { data, isLoading, error } = useDashboardActivity()

	// Extract activities array from the response
	const activities: Activity[] = data?.activities || []

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin" />
				<span
					className="ml-2 text-muted-foreground"
					style={{
						fontSize: 'var(--font-body)',
						lineHeight: 'var(--line-height-body)'
					}}
				>
					Loading activities...
				</span>
			</div>
		)
	}

	if (error) {
		return (
			<div className="text-center py-8">
				<p className="text-sm text-muted-foreground">Failed to load recent activities</p>
			</div>
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
			{activities.map((activity: Activity) => {
				const Icon = getIconForType(activity.entityType)
				const { color, bgColor } = getColorForType(activity.entityType)

				return (
					<div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-[var(--color-muted)] transition-colors duration-200">
						{/* Activity Icon */}
						<div
							className="flex h-10 w-10 items-center justify-center rounded-full border"
							style={{
								backgroundColor: bgColor,
								borderColor: `color-mix(in oklab, ${color} 20%, transparent)`
							}}
						>
							<Icon
								className="h-4 w-4"
								style={{ color }}
							/>
						</div>

						{/* Activity Content */}
						<div className="min-w-0 flex-1">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 mb-2">
										<p
											className="font-medium"
											style={{
												color: 'var(--color-label-primary)',
												fontSize: 'var(--font-body)',
												lineHeight: 'var(--line-height-body)'
											}}
										>
											{activity.action}
										</p>
										{getActivityBadge(activity.entityType)}
									</div>
									<p
										className="mb-2"
										style={{
											color: 'var(--color-label-secondary)',
											fontSize: 'var(--font-body)',
											lineHeight: 'var(--line-height-body)'
										}}
									>
										{activity.entityName ? `${activity.entityName} (${activity.entityId})` : activity.entityId}
									</p>
									<div className="flex items-center gap-2">
										<span
											className="flex items-center gap-1"
											style={{
												color: 'var(--color-label-tertiary)',
												fontSize: 'var(--font-footnote)',
												lineHeight: 'var(--line-height-footnote)'
											}}
										>
											<Clock className="h-3 w-3" />
											{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
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