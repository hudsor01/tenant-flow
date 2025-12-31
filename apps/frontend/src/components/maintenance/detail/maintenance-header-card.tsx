'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { formatCurrency } from '#lib/formatters/currency'
import {
	Calendar,
	DollarSign,
	Download,
	Edit2,
	MapPin,
	Wrench
} from 'lucide-react'
import Link from 'next/link'
import type { MaintenanceStatus, MaintenancePriority } from '@repo/shared/types/core'
import { STATUS_CONFIG, PRIORITY_CONFIG } from './maintenance-utils'
import { StatusSelect } from './status-select'
import { ScheduleDialog } from './schedule-dialog'

interface PropertyInfo {
	name?: string | null
}

interface UnitInfo {
	unit_number?: string | null
}

interface MaintenanceRequest {
	id: string
	title?: string | null
	description?: string | null
	status: string
	priority: string
	scheduled_date?: string | null
	estimated_cost?: number | null
	actual_cost?: number | null
}

interface MaintenanceHeaderCardProps {
	request: MaintenanceRequest
	property?: PropertyInfo | null | undefined
	unit?: UnitInfo | null | undefined
	totalExpenses: number
	onRefresh: () => void
	onExport: () => void
}

export function MaintenanceHeaderCard({
	request,
	property,
	unit,
	totalExpenses,
	onRefresh,
	onExport
}: MaintenanceHeaderCardProps) {
	const statusConfig =
		STATUS_CONFIG[request.status as MaintenanceStatus] ?? STATUS_CONFIG.open
	const priorityConfig =
		PRIORITY_CONFIG[request.priority as MaintenancePriority] ??
		PRIORITY_CONFIG.normal

	return (
		<Card>
			<CardHeader className="flex-row items-start justify-between gap-4">
				<div className="space-y-2">
					<CardTitle className="flex items-center gap-2 text-xl">
						<Wrench className="size-5 text-primary" />
						{request.title ?? request.description ?? 'Maintenance Request'}
					</CardTitle>
					<div className="flex flex-wrap gap-2">
						<Badge className={`${statusConfig.className} gap-1`}>
							{statusConfig.icon}
							{statusConfig.label}
						</Badge>
						<Badge className={priorityConfig.className}>
							{priorityConfig.label} Priority
						</Badge>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<StatusSelect
						currentStatus={request.status as MaintenanceStatus}
						maintenanceId={request.id}
						onSuccess={onRefresh}
					/>
					<Button asChild variant="outline" size="sm">
						<Link href={`/maintenance/${request.id}/edit`}>
							<Edit2 className="size-4 mr-1.5" />
							Edit
						</Link>
					</Button>
					<Button variant="outline" size="sm" onClick={onExport}>
						<Download className="size-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Description */}
				<section className="space-y-2">
					<h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
						Description
					</h2>
					<p className="text-sm leading-relaxed">
						{request.description || 'No description provided.'}
					</p>
				</section>

				{/* Location & Schedule */}
				<section className="grid gap-4 md:grid-cols-2">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<MapPin className="size-4" />
							Location
						</div>
						<p className="mt-1 font-medium">
							{property?.name ?? 'Unassigned property'}
						</p>
						{unit && (
							<p className="text-sm text-muted-foreground">
								Unit {unit.unit_number}
							</p>
						)}
					</div>

					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Calendar className="size-4" />
								Scheduled Date
							</div>
							<ScheduleDialog
								maintenanceId={request.id}
								currentDate={request.scheduled_date}
								onSuccess={onRefresh}
							/>
						</div>
						<p className="mt-1 font-medium">
							{request.scheduled_date
								? new Date(request.scheduled_date).toLocaleDateString('en-US', {
										weekday: 'long',
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})
								: 'Not scheduled'}
						</p>
					</div>
				</section>

				{/* Cost Summary */}
				<section className="grid gap-4 md:grid-cols-3">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<DollarSign className="size-4" />
							Estimated Cost
						</div>
						<p className="mt-1 font-medium text-lg">
							{request.estimated_cost
								? formatCurrency(request.estimated_cost)
								: '-'}
						</p>
					</div>
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<DollarSign className="size-4" />
							Actual Cost
						</div>
						<p className="mt-1 font-medium text-lg">
							{request.actual_cost ? formatCurrency(request.actual_cost) : '-'}
						</p>
					</div>
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<DollarSign className="size-4" />
							Total Expenses
						</div>
						<p className="mt-1 font-medium text-lg">
							{totalExpenses > 0 ? formatCurrency(totalExpenses) : '-'}
						</p>
					</div>
				</section>
			</CardContent>
		</Card>
	)
}
