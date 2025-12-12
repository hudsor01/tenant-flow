'use client'

import { useMemo, useState, useTransition } from 'react'
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
	closestCorners
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
	createSnapModifier,
	restrictToWindowEdges
} from '@dnd-kit/modifiers'
import { Badge } from '#components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { toast } from 'sonner'
import { MaintenanceCard } from './maintenance-card'
import { MaintenanceSortableCard } from './maintenance-sortable-card'
import type { MaintenanceRequest, MaintenanceStatus } from '@repo/shared/types/core'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { apiRequest } from '#lib/api-request'

const logger = createLogger({ component: 'MaintenanceKanban' })

// Extended type with optional relations for display
type MaintenanceRequestWithRelations = MaintenanceRequest & {
	property?: { name: string } | null
	unit?: { name: string } | null
	assignedTo?: { name: string } | null
}

const COLUMNS: {
	id: MaintenanceStatus
	title: string
	variant: 'default' | 'secondary' | 'outline'
}[] = [
	{ id: 'open', title: 'Open', variant: 'default' },
	{
		id: 'in_progress',
		title: 'In Progress',
		variant: 'secondary'
	},
	{ id: 'completed', title: 'Completed', variant: 'default' },
	{ id: 'cancelled', title: 'Cancelled', variant: 'outline' },
	{ id: 'on_hold', title: 'On Hold', variant: 'outline' }
]

interface MaintenanceKanbanProps {
	initialRequests: MaintenanceRequestWithRelations[]
}

export function MaintenanceKanban({ initialRequests }: MaintenanceKanbanProps) {
	const [requests, setRequests] =
		useState<MaintenanceRequestWithRelations[]>(initialRequests || [])
	const [activeRequest, setActiveRequest] = useState<MaintenanceRequestWithRelations | null>(
		null
	)
	const [, startTransition] = useTransition()

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8 // 8px movement before drag starts
			}
		})
	)

	// Grid snapping for professional alignment (16px grid)
	const snapToGrid = createSnapModifier(16)

	// Memoize grouping to avoid recalculating on every render
	const requestsByStatus = useMemo(
		() =>
			(requests || []).reduce(
				(acc, request) => {
					const status = request.status
					if (status && !acc[status]) acc[status] = []
					if (status) acc[status].push(request)
					return acc
				},
				{} as Record<MaintenanceStatus, MaintenanceRequestWithRelations[]>
			),
		[requests]
	)

	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event
		const request = requests.find(r => r.id === active.id)
		if (request) {
			setActiveRequest(request)
		}
	}

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		setActiveRequest(null)

		if (!over) return

		const requestId = active.id as string
		const newStatus = over.id as MaintenanceStatus

		const request = requests.find(r => r.id === requestId)
		if (!request || request.status === newStatus) return

		// Optimistic update
		const oldStatus = request.status
		setRequests(prev =>
			prev.map(r => (r.id === requestId ? { ...r, status: newStatus } : r))
		)

		// API update
		startTransition(async () => {
			try {
				await apiRequest<void>(`/api/v1/maintenance/${requestId}`, {
					method: 'PUT',
					body: JSON.stringify({
						status: newStatus,
						completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined
					})
				})

				toast.success(
					`Request moved to ${COLUMNS.find(c => c.id === newStatus)?.title}`
				)
			} catch (error) {
				logger.error('Status update failed', {
					action: 'handleDragEnd',
					metadata: { requestId, newStatus, error }
				})
				toast.error('Failed to update status')
				// Rollback on error
				setRequests(prev =>
					prev.map(r => (r.id === requestId ? { ...r, status: oldStatus } : r))
				)
			}
		})
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			modifiers={[snapToGrid, restrictToWindowEdges]}
		>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{COLUMNS.map(column => {
					const columnRequests = requestsByStatus[column.id] || []
					return (
						<Card key={column.id} className="flex flex-col">
							<CardHeader className="pb-3">
								<div className="flex-between">
									<CardTitle className="text-base font-medium">
										{column.title}
									</CardTitle>
									<Badge variant={column.variant}>
										{columnRequests.length}
									</Badge>
								</div>
							</CardHeader>
							<CardContent className="flex-1 space-y-3 min-h-[400px]">
								<SortableContext
									id={column.id}
									items={columnRequests.map(r => r.id)}
									strategy={verticalListSortingStrategy}
								>
									{columnRequests.map(request => (
										<MaintenanceSortableCard
											key={request.id}
											request={request}
											columnId={column.id}
										/>
									))}
								</SortableContext>
							</CardContent>
						</Card>
					)
				})}
			</div>

			<DragOverlay>
				{activeRequest ? (
					<MaintenanceCard request={activeRequest} isDragging />
				) : null}
			</DragOverlay>
		</DndContext>
	)
}
