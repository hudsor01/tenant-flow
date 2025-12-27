'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MaintenanceCard } from './maintenance-card'
import type { MaintenanceRequest } from '@repo/shared/types/core'

// Extended type with optional relations for display
type MaintenanceRequestWithRelations = MaintenanceRequest & {
	property?: { name: string } | null
	unit?: { name: string } | null
	assignedTo?: { name: string } | null
	tenant?: { name: string } | null
}

interface MaintenanceSortableCardProps {
	request: MaintenanceRequestWithRelations
	columnId: string
	onView?: (id: string) => void
}

export function MaintenanceSortableCard({
	request,
	columnId,
	onView
}: MaintenanceSortableCardProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: request.id,
		data: {
			type: 'maintenance-request',
			request,
			columnId
		}
	})

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		cursor: isDragging ? 'grabbing' : 'grab'
	}

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			<MaintenanceCard request={request} isDragging={isDragging} onView={onView} />
		</div>
	)
}
