'use client'

import { EditMaintenanceButton } from '@/app/(protected)/manage/maintenance/[id]/edit/edit-button'
import { DeleteMaintenanceButton } from '@/app/(protected)/manage/maintenance/delete-button'
import { StatusUpdateButton } from '@/app/(protected)/manage/maintenance/status-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import type { Tables } from '@repo/shared/types/supabase-generated'
import {
	AlertTriangle,
	Calendar,
	Clock,
	DollarSign,
	Eye,
	MapPin,
	User,
	Wrench
} from 'lucide-react'
import { useState } from 'react'

type MaintenanceRequest = Tables<'maintenance_request'>

interface MaintenanceActionButtonsProps {
	maintenance: MaintenanceRequest & {
		property: { name: string } | null
		unit?: { name: string } | null
		assignedTo?: { name: string } | null
	}
}

export function MaintenanceActionButtons({
	maintenance
}: MaintenanceActionButtonsProps) {
	const [viewOpen, setViewOpen] = useState(false)

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'EMERGENCY':
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
				<Eye className="w-4 h-4" />
				View
			</Button>

			{/* Edit Button */}
			<EditMaintenanceButton maintenance={maintenance} />

			{/* Status Update Button */}
			<StatusUpdateButton maintenance={maintenance} />

			{/* Delete Button */}
			<DeleteMaintenanceButton maintenance={maintenance} />

			{/* View Dialog */}
			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Wrench className="w-5 h-5" />
							{maintenance.title}
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
									<MapPin className="w-4 h-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium">Property</p>
										<p className="text-sm text-muted-foreground">
											{maintenance.property?.name || 'No Property'}
										</p>
									</div>
								</div>
							)}

							{maintenance.unitId && (
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 rounded bg-muted flex items-center justify-center">
										<span className="text-xs font-bold">#</span>
									</div>
									<div>
										<p className="text-sm font-medium">Unit</p>
										<p className="text-sm text-muted-foreground">
											Unit {maintenance.unitId}
										</p>
									</div>
								</div>
							)}
						</div>

						{/* Category and Cost */}
						<div className="grid grid-cols-2 gap-4">
							<div className="flex items-center gap-2">
								<Wrench className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Category</p>
									<p className="text-sm text-muted-foreground">
										{maintenance.category || 'General'}
									</p>
								</div>
							</div>

							{maintenance.estimatedCost && (
								<div className="flex items-center gap-2">
									<DollarSign className="w-4 h-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium">Estimated Cost</p>
										<p className="text-sm text-muted-foreground">
											${maintenance.estimatedCost.toLocaleString()}
										</p>
									</div>
								</div>
							)}
						</div>

						{/* Assignment and Dates */}
						<div className="grid grid-cols-2 gap-4">
							{maintenance.assignedTo && (
								<div className="flex items-center gap-2">
									<User className="w-4 h-4 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium">Assigned To</p>
										<p className="text-sm text-muted-foreground">
											{maintenance.assignedTo}
										</p>
									</div>
								</div>
							)}

							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Created</p>
									<p className="text-sm text-muted-foreground">
										{maintenance.createdAt
											? new Date(maintenance.createdAt).toLocaleDateString()
											: 'No date'}
									</p>
								</div>
							</div>
						</div>

						{/* Preferred Date */}
						{maintenance.preferredDate && (
							<div className="flex items-center gap-2">
								<Clock className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Preferred Date</p>
									<p className="text-sm text-muted-foreground">
										{new Date(maintenance.preferredDate).toLocaleDateString()}
									</p>
								</div>
							</div>
						)}

						{/* Allow Entry */}
						{maintenance.allowEntry !== undefined && (
							<div className="flex items-center gap-2">
								<AlertTriangle className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Entry Permission</p>
									<p className="text-sm text-muted-foreground">
										{maintenance.allowEntry
											? 'Entry Allowed'
											: 'No Entry Without Tenant Present'}
									</p>
								</div>
							</div>
						)}

						{/* Notes */}
						{maintenance.notes && (
							<div className="space-y-2">
								<h4 className="font-medium">Notes</h4>
								<p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
									{maintenance.notes}
								</p>
							</div>
						)}

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
					</div>
				</DialogContent>
			</Dialog>
		</ButtonGroup>
	)
}
