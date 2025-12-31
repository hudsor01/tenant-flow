'use client'

import { Badge } from '#components/ui/badge'
import { Separator } from '#components/ui/separator'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import { Calendar, Wrench } from 'lucide-react'
import { formatDate } from '#lib/formatters/date'
import { cn } from '#lib/utils'

interface TenantMaintenanceCardProps {
	request: MaintenanceRequest
	layout?: 'stacked' | 'inline'
}

const statusClassMap: Record<string, string> = {
	OPEN: 'badge badge-secondary',
	IN_PROGRESS: 'badge badge-warning',
	COMPLETED: 'badge badge-success',
	CANCELED: 'badge badge-outline'
}

const priorityColorMap: Record<string, string> = {
	URGENT: 'text-destructive',
	HIGH: 'text-warning',
	MEDIUM: 'text-warning',
	LOW: 'text-info'
}

const formatStatus = (status: string) => status.replace('_', ' ')

export function TenantMaintenanceCard({
	request,
	layout = 'stacked'
}: TenantMaintenanceCardProps) {
	return (
		<div
			data-testid="maintenance-request-card"
			data-layout={layout}
			className="rounded-lg border p-4 bg-card shadow-sm space-y-3"
		>
			<div className="flex items-start gap-3">
				<Wrench className="size-5 text-primary mt-0.5" aria-hidden />
				<div className="space-y-2 flex-1 min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<p className="font-medium leading-tight break-words">
							{request.description.length > 100
								? `${request.description.slice(0, 100)}…`
								: request.description}
						</p>
						<span
							className={cn(
								'text-xs font-semibold uppercase',
								priorityColorMap[request.priority] ?? 'text-muted-foreground'
							)}
						>
							{request.priority}
						</span>
					</div>
					<p className="text-muted text-sm leading-snug line-clamp-3 md:line-clamp-2">
						{request.description}
					</p>
					<div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
						<Calendar className="size-3" aria-hidden />
						<span>
							Submitted{' '}
							{formatDate(request.created_at || new Date().toISOString(), {
								relative: true
							})}
						</span>
						{request.completed_at && (
							<>
								<span>•</span>
								<span>
									Completed{' '}
									{formatDate(request.completed_at, { relative: true })}
								</span>
							</>
						)}
					</div>
				</div>
			</div>

			<Separator />

			<div className="flex flex-wrap items-center justify-between gap-3">
				<Badge
					variant="outline"
					className={cn(
						statusClassMap[request.status] ?? 'badge badge-outline'
					)}
				>
					{formatStatus(request.status)}
				</Badge>
				{request.unit_id && (
					<span className="text-xs text-muted-foreground">
						Unit {request.unit_id}
					</span>
				)}
			</div>
		</div>
	)
}
