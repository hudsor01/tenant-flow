'use client'

import { EditMaintenanceButton } from '#app/(protected)/manage/maintenance/[id]/edit/edit-button'
import { DeleteMaintenanceButton } from '#app/(protected)/manage/maintenance/delete-button'
import { StatusUpdateButton } from '#app/(protected)/manage/maintenance/status-button'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { ButtonGroup } from '#components/ui/button-group'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import {
	Calendar,
	DollarSign,
	Eye,
	MapPin,
	Wrench
} from 'lucide-react'
import { useState } from 'react'

interface MaintenanceActionButtonsProps {
	maintenance: MaintenanceRequest & {
		property: { name: string } | null
		unit?: { name: string } | null
	}
	deleteAction: (id: string) => Promise<{ success: boolean }>
}

export function MaintenanceActionButtons({
	maintenance,
	deleteAction
}: MaintenanceActionButtonsProps) {
	const [viewOpen, setViewOpen] = useState(false)

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'URGENT':
				return 'bg-destructive text-destructive-foreground'
			case 'HIGH':
				return 'bg-chart-5 text-white'
			case 'MEDIUM':
				return 'bg-chart-4 text-white'
			case 'LOW':
				return 'bg-chart-1 text-white'
			default:
				return 'bg-muted text-muted-foreground'
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'OPEN':
				return 'bg-chart-4/10 text-chart-4'
			case 'IN_PROGRESS':
				return 'bg-chart-2/10 text-chart-2'
			case 'COMPLETED':
				return 'bg-chart-1/10 text-chart-1'
			case 'CANCELED':
				return 'bg-destructive/10 text-destructive'
			case 'ON_HOLD':
				return 'bg-muted/10 text-muted-foreground'
			default:
				return 'bg-muted text-muted-foreground'
		}
	}

	return (
		<ButtonGroup>
			{/* View Button & Dialog */}
			<Button variant="outline" size="sm" onClick={() => setViewOpen(true)}>
				<Eye className="size-4" />
				View
			</Button>

			{/* Edit Button */}
			<EditMaintenanceButton maintenance={maintenance} />

			{/* Status Update Button */}
			<StatusUpdateButton maintenance={maintenance} />

			{/* Delete Button */}
			<DeleteMaintenanceButton
				maintenance={maintenance}
				deleteAction={deleteAction}
			/>

			{/* View Dialog */}
			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Wrench className="size-5" />
							{maintenance.description}
						</DialogTitle>
						<DialogDescription>
							View detailed maintenance request information including status,
							priority, and assignment details.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* Status and Priority */}
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium">Status:</span>
								<Badge className={getStatusColor(maintenance.status)}>
									{maintenance.status}
								</Badge>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium">Priority:</span>
								<Badge className={getPriorityColor(maintenance.priority)}>
									{maintenance.priority}
								</Badge>
							</div>
						</div>

						{/* Description */}
						{maintenance.description && (
							<div className="space-y-2">
								<h4 className="font-medium">Description</h4>
								<p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
									{maintenance.description}
								</p>
							</div>
						)}

						{/* Property and Unit Information */}
						<div className="grid grid-cols-2 gap-4">
							{maintenance.property && (
								<div className="flex items-center gap-2">
									<MapPin className="size-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium">Property</p>
										<p className="text-sm text-muted-foreground">
											{maintenance.property?.name || 'No Property'}
										</p>
									</div>
								</div>
							)}

							{maintenance.unit_id && (
								<div className="flex items-center gap-2">
									<div className="size-4 rounded bg-muted flex items-center justify-center">
										<span className="text-xs font-bold">#</span>
									</div>
									<div>
										<p className="text-sm font-medium">Unit</p>
										<p className="text-sm text-muted-foreground">
											Unit {maintenance.unit_id}
										</p>
									</div>
								</div>
							)}
						</div>

						{/* Estimated Cost */}
						{maintenance.estimated_cost && (
							<div className="flex items-center gap-2">
								<DollarSign className="size-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Estimated Cost</p>
									<p className="text-sm text-muted-foreground">
										${maintenance.estimated_cost.toLocaleString()}
									</p>
								</div>
							</div>
						)}
						</div>

						{/* Dates */}
						<div className="flex items-center gap-2">
							<Calendar className="size-4 text-muted-foreground" />
							<div>
								<p className="text-sm font-medium">Created</p>
								<p className="text-sm text-muted-foreground">
									{maintenance.created_at
										? new Date(maintenance.created_at).toLocaleDateString()
										: 'No date'}
								</p>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-end pt-4 border-t">
							<ButtonGroup>
								<Button variant="outline" onClick={() => setViewOpen(false)}>
									Close
								</Button>
								<EditMaintenanceButton maintenance={maintenance} />
								<StatusUpdateButton maintenance={maintenance} />
							</ButtonGroup>
					</div>
				</DialogContent>
			</Dialog>
		</ButtonGroup>
	)
}
