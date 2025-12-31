'use client'

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription
} from '#components/ui/card'
import { cn } from '#lib/utils'
import {
	type TimelineEvent,
	getTimelineIcon,
	getTimelineColor,
	formatRelativeTime,
	formatDate
} from './lease-detail-utils'

interface LeaseTimelineTabProps {
	events: TimelineEvent[]
}

export function LeaseTimelineTab({ events }: LeaseTimelineTabProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Lease History</CardTitle>
				<CardDescription>
					Key events and milestones for this lease
				</CardDescription>
			</CardHeader>
			<CardContent>
				{events.length > 0 ? (
					<div className="relative">
						{/* Timeline line */}
						<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

						<div className="space-y-6">
							{events.map((event, index) => {
								const Icon = getTimelineIcon(event.type)
								const colorClass = getTimelineColor(event.type)

								return (
									<div key={event.id} className="relative flex gap-4 pl-2">
										{/* Icon */}
										<div
											className={cn(
												'relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0',
												colorClass
											)}
										>
											<Icon className="w-4 h-4" />
										</div>

										{/* Content */}
										<div className="flex-1 pb-6">
											<div className="flex items-center justify-between gap-2">
												<h4 className="font-medium">{event.title}</h4>
												<time className="text-xs text-muted-foreground">
													{formatRelativeTime(event.timestamp)}
												</time>
											</div>
											<p className="text-sm text-muted-foreground mt-0.5">
												{event.description}
											</p>
											{event.actor && (
												<p className="text-xs text-muted-foreground mt-1">
													by {event.actor}
												</p>
											)}
											{index === events.length - 1 && (
												<p className="text-xs text-muted-foreground mt-1">
													{formatDate(event.timestamp)}
												</p>
											)}
										</div>
									</div>
								)
							})}
						</div>
					</div>
				) : (
					<p className="text-muted-foreground text-center py-6">
						No timeline events recorded yet
					</p>
				)}
			</CardContent>
		</Card>
	)
}
