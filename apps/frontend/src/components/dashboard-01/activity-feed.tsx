'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

const getActivityBadge = (type: string) => {
	switch (type) {
		case 'payment':
			return <Badge variant="outline" className="text-green-600 border-green-200">Payment</Badge>
		case 'maintenance':
			return <Badge variant="outline" className="text-blue-600 border-blue-200">Maintenance</Badge>
		case 'lease':
			return <Badge variant="outline" className="text-purple-600 border-purple-200">Lease</Badge>
		case 'property':
			return <Badge variant="outline" className="text-indigo-600 border-indigo-200">Property</Badge>
		case 'tenant':
			return <Badge variant="outline" className="text-orange-600 border-orange-200">Tenant</Badge>
		default:
			return <Badge variant="outline">Activity</Badge>
	}
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
	switch (type) {
		case 'payment': return { color: 'text-green-600', bgColor: 'bg-green-50' }
		case 'maintenance': return { color: 'text-blue-600', bgColor: 'bg-blue-50' }
		case 'lease': return { color: 'text-purple-600', bgColor: 'bg-purple-50' }
		case 'property': return { color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
		case 'tenant': return { color: 'text-orange-600', bgColor: 'bg-orange-50' }
		default: return { color: 'text-gray-600', bgColor: 'bg-gray-50' }
	}
}

export function ActivityFeed() {
	const { data, isLoading, error } = useDashboardActivity()

	// Extract activities array from the response
	const activities: any[] = data?.activities || []

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin" />
				<span className="ml-2 text-sm text-muted-foreground">Loading activities...</span>
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
			{activities.map((activity: {
				id: string | number
				type: string
				title: string
				description?: string
				timestamp?: string
				user?: {
					name: string
					avatar?: string
					initials?: string
				}
			}) => {
				const Icon = getIconForType(activity.type)
				const { color, bgColor } = getColorForType(activity.type)

				return (
					<div key={activity.id} className="flex items-start gap-4">
						{/* Activity Icon */}
						<div className={`flex h-10 w-10 items-center justify-center rounded-full ${bgColor}`}>
							<Icon className={`h-4 w-4 ${color}`} />
						</div>

						{/* Activity Content */}
						<div className="min-w-0 flex-1">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 mb-1">
										<p className="text-sm font-medium text-foreground">
											{activity.title}
										</p>
										{getActivityBadge(activity.type)}
									</div>
									<p className="text-sm text-muted-foreground mb-2">
										{activity.description}
									</p>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										{activity.user && (
											<>
												<Avatar className="h-5 w-5">
													<AvatarImage src={activity.user.avatar} />
													<AvatarFallback className="text-[10px]">
														{activity.user.initials}
													</AvatarFallback>
												</Avatar>
												<span>{activity.user.name}</span>
												<span>•</span>
											</>
										)}
										<span className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{activity.timestamp && formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
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