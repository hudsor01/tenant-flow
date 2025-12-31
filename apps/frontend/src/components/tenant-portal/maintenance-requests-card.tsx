'use client'

import {
	Wrench,
	Plus,
	ChevronRight,
	Clock,
	AlertCircle,
	CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'

export type MaintenanceRequestStatus =
	| 'open'
	| 'in_progress'
	| 'completed'
	| 'cancelled'

interface MaintenanceRequest {
	id: string
	title: string
	status: MaintenanceRequestStatus
}

interface MaintenanceRequestsCardProps {
	requests: MaintenanceRequest[]
	onViewRequest?: ((requestId: string) => void) | undefined
	onSubmitRequest?: (() => void) | undefined
}

function getRequestStatusIndicator(status: MaintenanceRequestStatus) {
	const config = {
		open: {
			className: 'text-warning',
			icon: Clock,
			label: 'Open'
		},
		in_progress: {
			className: 'text-primary',
			icon: AlertCircle,
			label: 'In Progress'
		},
		completed: {
			className: 'text-success',
			icon: CheckCircle,
			label: 'Completed'
		},
		cancelled: {
			className: 'text-muted-foreground',
			icon: Clock,
			label: 'Cancelled'
		}
	}

	const { className, icon: Icon, label } = config[status]

	return (
		<span
			className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}
		>
			<Icon className="w-3.5 h-3.5" aria-hidden="true" />
			{label}
		</span>
	)
}

export function MaintenanceRequestsCard({
	requests,
	onViewRequest,
	onSubmitRequest
}: MaintenanceRequestsCardProps) {
	return (
		<BlurFade delay={0.5} inView>
			<div className="bg-card border border-border rounded-lg">
				<div className="p-5 border-b border-border flex items-center justify-between">
					<div>
						<h3 className="font-medium text-foreground">
							Maintenance Requests
						</h3>
						<p className="text-sm text-muted-foreground">Track your requests</p>
					</div>
					<Button asChild size="sm" className="gap-1.5">
						<Link
							href="/tenant/maintenance/new"
							{...(onSubmitRequest ? { onClick: onSubmitRequest } : {})}
						>
							<Plus className="w-4 h-4" aria-hidden="true" />
							New
						</Link>
					</Button>
				</div>
				<div className="divide-y divide-border">
					{requests.length === 0 ? (
						<div className="p-8 text-center">
							<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
								<Wrench
									className="w-6 h-6 text-muted-foreground"
									aria-hidden="true"
								/>
							</div>
							<p className="text-muted-foreground mb-4">
								No maintenance requests
							</p>
							<Button asChild className="gap-2">
								<Link
									href="/tenant/maintenance/new"
									{...(onSubmitRequest ? { onClick: onSubmitRequest } : {})}
								>
									<Wrench className="w-4 h-4" aria-hidden="true" />
									Submit a Request
								</Link>
							</Button>
						</div>
					) : (
						requests.slice(0, 4).map((request, idx) => (
							<BlurFade key={request.id} delay={0.55 + idx * 0.05} inView>
								<Link
									href={`/tenant/maintenance/${request.id}`}
									{...(onViewRequest
										? { onClick: () => onViewRequest(request.id) }
										: {})}
									className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
											<Wrench
												className="w-5 h-5 text-muted-foreground"
												aria-hidden="true"
											/>
										</div>
										<div className="min-w-0">
											<p className="font-medium text-foreground truncate">
												{request.title}
											</p>
											<div className="mt-1">
												{getRequestStatusIndicator(request.status)}
											</div>
										</div>
									</div>
									<ChevronRight
										className="w-5 h-5 text-muted-foreground flex-shrink-0"
										aria-hidden="true"
									/>
								</Link>
							</BlurFade>
						))
					)}
				</div>
				{requests.length > 0 && (
					<div className="p-4 border-t border-border">
						<Link
							href="/tenant/maintenance"
							className="text-sm text-primary hover:underline font-medium"
						>
							View All Requests
						</Link>
					</div>
				)}
			</div>
		</BlurFade>
	)
}
