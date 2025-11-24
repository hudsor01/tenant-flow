'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MaintenanceCard } from './maintenance-card'
import type { MaintenanceRequestResponse } from '@repo/shared/types/core'

type MaintenanceRequest = MaintenanceRequestResponse['data'][number]

interface MaintenanceSortableCardProps {
	request: MaintenanceRequest
	columnId: string
}

export function MaintenanceSortableCard({ request, columnId }: MaintenanceSortableCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging
	} = useSortable({
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
			<MaintenanceCard request={request} isDragging={isDragging} />
		</div>
	)
}
