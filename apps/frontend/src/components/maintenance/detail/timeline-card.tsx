'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Calendar, CheckCircle, Clock } from 'lucide-react'
import type { TimelineEvent } from './maintenance-utils'

interface TimelineCardProps {
	timeline: TimelineEvent[]
}

export function TimelineCard({ timeline }: TimelineCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Timeline</CardTitle>
			</CardHeader>
			<CardContent>
				{timeline.length === 0 ? (
					<p className="text-sm text-muted-foreground">No activity yet</p>
				) : (
					<div className="relative">
						<div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
						<div className="space-y-4">
							{timeline.map(event => (
								<div key={event.id} className="relative pl-8">
									<div
										className={`absolute left-0 size-6 rounded-full flex items-center justify-center ${
											event.type === 'completed'
												? 'bg-green-500/10 text-green-600'
												: 'bg-primary/10 text-primary'
										}`}
									>
										{event.type === 'completed' ? (
											<CheckCircle className="size-3.5" />
										) : event.type === 'scheduled' ? (
											<Calendar className="size-3.5" />
										) : (
											<Clock className="size-3.5" />
										)}
									</div>
									<div>
										<p className="font-medium text-sm">{event.title}</p>
										{event.description && (
											<p className="text-xs text-muted-foreground">
												{event.description}
											</p>
										)}
										<p className="text-xs text-muted-foreground mt-1">
											{new Date(event.timestamp).toLocaleString()}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
