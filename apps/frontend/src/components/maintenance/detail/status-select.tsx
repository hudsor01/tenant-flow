'use client'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { useMaintenanceRequestUpdateMutation } from '#hooks/api/use-maintenance'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { MaintenanceStatus } from '@repo/shared/types/core'

const logger = createLogger({ component: 'StatusSelect' })

interface StatusSelectProps {
	currentStatus: MaintenanceStatus
	maintenanceId: string
	onSuccess: () => void
}

export function StatusSelect({
	currentStatus,
	maintenanceId,
	onSuccess
}: StatusSelectProps) {
	const updateMutation = useMaintenanceRequestUpdateMutation()

	const handleStatusChange = async (newStatus: MaintenanceStatus) => {
		if (newStatus === currentStatus) return

		try {
			await updateMutation.mutateAsync({
				id: maintenanceId,
				data: {
					status: newStatus,
					completed_at:
						newStatus === 'completed' ? new Date().toISOString() : undefined
				}
			})
			onSuccess()
		} catch (error) {
			logger.error('Failed to update status', { error })
		}
	}

	return (
		<Select
			value={currentStatus}
			onValueChange={v => handleStatusChange(v as MaintenanceStatus)}
		>
			<SelectTrigger className="w-40" aria-label="Change status">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="open">Open</SelectItem>
				<SelectItem value="in_progress">In Progress</SelectItem>
				<SelectItem value="on_hold">On Hold</SelectItem>
				<SelectItem value="completed">Completed</SelectItem>
				<SelectItem value="cancelled">Cancelled</SelectItem>
			</SelectContent>
		</Select>
	)
}
