'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUpdateMaintenanceStatus } from '@/hooks/api/use-maintenance'
import { Clock, Wrench, CheckCircle2, XCircle, Loader2, Pause } from 'lucide-react'
import type { MaintenanceRequest, RequestStatus } from '@repo/shared'

interface MaintenanceStatusUpdateProps {
	request: MaintenanceRequest
	onUpdate?: () => void
}

const statusOptions: {
	value: RequestStatus
	label: string
	icon: React.ReactNode
	description: string
}[] = [
	{
		value: 'OPEN',
		label: 'Open',
		icon: <Clock className="h-4 w-4" />,
		description: 'Request is waiting to be addressed'
	},
	{
		value: 'IN_PROGRESS',
		label: 'In Progress',
		icon: <Wrench className="h-4 w-4" />,
		description: 'Work is actively being done'
	},
	{
		value: 'COMPLETED',
		label: 'Completed',
		icon: <CheckCircle2 className="h-4 w-4" />,
		description: 'Work has been finished'
	},
	{
		value: 'CANCELED',
		label: 'Cancelled',
		icon: <XCircle className="h-4 w-4" />,
		description: 'Request has been cancelled'
	},
	{
		value: 'ON_HOLD',
		label: 'On Hold',
		icon: <Pause className="h-4 w-4" />,
		description: 'Request is temporarily paused'
	}
]

export function MaintenanceStatusUpdate({ 
	request, 
	onUpdate 
}: MaintenanceStatusUpdateProps) {
	const [selectedStatus, setSelectedStatus] = useState<RequestStatus>(
		request.status
	)
	
	const updateStatus = useUpdateMaintenanceStatus()

	const handleStatusUpdate = () => {
		if (selectedStatus === request.status) return

		updateStatus.mutate(
			{ id: request.id, status: selectedStatus },
			{
				onSuccess: () => {
					onUpdate?.()
				}
			}
		)
	}

	const currentStatus = statusOptions.find(option => option.value === request.status)
	const newStatus = statusOptions.find(option => option.value === selectedStatus)
	const hasChanged = selectedStatus !== request.status

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center space-x-2">
					{currentStatus?.icon}
					<span>Update Status</span>
				</CardTitle>
				<CardDescription>
					Current status: <span className="font-medium">{currentStatus?.label}</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium">New Status</label>
					<Select value={selectedStatus} onValueChange={(value: RequestStatus) => setSelectedStatus(value)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{statusOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div className="flex items-center space-x-2">
										{option.icon}
										<div className="flex flex-col">
											<span className="font-medium">{option.label}</span>
											<span className="text-xs text-muted-foreground">
												{option.description}
											</span>
										</div>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{hasChanged && (
					<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
						<p className="text-sm text-blue-800">
							Status will change from <span className="font-medium">{currentStatus?.label}</span> to{' '}
							<span className="font-medium">{newStatus?.label}</span>
						</p>
					</div>
				)}

				<div className="flex space-x-2">
					<Button
						onClick={handleStatusUpdate}
						disabled={!hasChanged || updateStatus.isPending}
						className="flex-1"
					>
						{updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						Update Status
					</Button>
					
					{hasChanged && (
						<Button
							variant="outline"
							onClick={() => setSelectedStatus(request.status)}
							disabled={updateStatus.isPending}
						>
							Reset
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}