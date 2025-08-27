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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { useUpdateMaintenanceRequest } from '@/hooks/api/use-maintenance'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type MaintenanceRequest = Database['public']['Tables']['MaintenanceRequest']['Row']
type RequestStatus = Database['public']['Enums']['RequestStatus']

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
		icon: <i className="i-lucide-clock inline-block h-4 w-4"  />,
		description: 'Request is waiting to be addressed'
	},
	{
		value: 'IN_PROGRESS',
		label: 'In Progress',
		icon: <i className="i-lucide-wrench inline-block h-4 w-4"  />,
		description: 'Work is actively being done'
	},
	{
		value: 'COMPLETED',
		label: 'Completed',
		icon: <i className="i-lucide-checkcircle2 inline-block h-4 w-4"  />,
		description: 'Work has been finished'
	},
	{
		value: 'CANCELED',
		label: 'Cancelled',
		icon: <i className="i-lucide-xcircle inline-block h-4 w-4"  />,
		description: 'Request has been cancelled'
	},
	{
		value: 'ON_HOLD',
		label: 'On Hold',
		icon: <i className="i-lucide-pause inline-block h-4 w-4"  />,
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

	const updateRequest = useUpdateMaintenanceRequest()

	const handleStatusUpdate = async () => {
		if (selectedStatus === request.status) return

		try {
			await updateRequest.mutate(request.id, { status: selectedStatus })
			onUpdate?.()
		} catch (error) {
			console.error('Failed to update maintenance request status:', error)
		}
	}

	const currentStatus = statusOptions.find(
		option => option.value === request.status
	)
	const newStatus = statusOptions.find(
		option => option.value === selectedStatus
	)
	const hasChanged = selectedStatus !== request.status

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center space-x-2">
					{currentStatus?.icon}
					<span>Update Status</span>
				</CardTitle>
				<CardDescription>
					Current status:{' '}
					<span className="font-medium">{currentStatus?.label}</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium">New Status</label>
					<Select
						value={selectedStatus}
						onValueChange={(value: RequestStatus) =>
							setSelectedStatus(value)
						}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{statusOptions.map(option => (
								<SelectItem
									key={option.value}
									value={option.value}
								>
									<div className="flex items-center space-x-2">
										{option.icon}
										<div className="flex flex-col">
											<span className="font-medium">
												{option.label}
											</span>
											<span className="text-muted-foreground text-xs">
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
					<div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
						<p className="text-sm text-blue-800">
							Status will change from{' '}
							<span className="font-medium">
								{currentStatus?.label}
							</span>{' '}
							to{' '}
							<span className="font-medium">
								{newStatus?.label}
							</span>
						</p>
					</div>
				)}

				<div className="flex space-x-2">
					<Button
						onClick={handleStatusUpdate}
						disabled={!hasChanged || updateRequest.isPending}
						className="flex-1"
					>
						{updateRequest.isPending && (
							<i className="i-lucide-loader-2 inline-block mr-2 h-4 w-4 animate-spin"  />
						)}
						Update Status
					</Button>

					{hasChanged && (
						<Button
							variant="outline"
							onClick={() => setSelectedStatus(request.status)}
							disabled={updateRequest.isPending}
						>
							Reset
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
