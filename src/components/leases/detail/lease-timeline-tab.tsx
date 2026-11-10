import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { formatDate } from "#lib/formatters/date";
import { cn } from "#lib/utils";
import {
	formatRelativeTime,
	getTimelineColor,
	getTimelineIcon,
	type LeaseTimelineEvent,
} from "./lease-detail-utils";

interface LeaseTimelineTabProps {
	events: LeaseTimelineEvent[];
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
								const Icon = getTimelineIcon(event.type);
								const colorClass = getTimelineColor(event.type);

								return (
									<div key={event.id} className="relative flex gap-4 pl-2">
										{/* Icon: an opaque disc over the rail, so the rail stops at
										    its edge, with the event's tint on a layer inside it (a
										    tint alone lets the rail show through). */}
										<div className="relative z-10 w-8 h-8 rounded-full shrink-0 bg-card">
											<div
												className={cn(
													"flex items-center justify-center size-full rounded-full",
													colorClass,
												)}
											>
												<Icon className="w-4 h-4" />
											</div>
										</div>

										{/* Content */}
										<div className="flex-1 pb-6">
											<div className="flex items-center justify-between gap-2">
												<h4 className="font-medium">{event.title}</h4>
												<time className="text-xs text-muted-foreground">
													{formatRelativeTime(event.timestamp)}
												</time>
											</div>
											<p className="text-sm text-muted-foreground mt-0.5 mb-0">
												{event.description}
											</p>
											{event.actor && (
												<p className="text-xs text-muted-foreground mt-1 mb-0">
													by {event.actor}
												</p>
											)}
											{index === events.length - 1 && (
												<p className="text-xs text-muted-foreground mt-1 mb-0">
													{formatDate(event.timestamp)}
												</p>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				) : (
					<p className="mb-0 text-muted-foreground text-center py-6">
						No timeline events recorded yet
					</p>
				)}
			</CardContent>
		</Card>
	);
}
