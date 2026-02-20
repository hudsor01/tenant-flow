'use client'

import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'
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
import { createSnapModifier, restrictToWindowEdges } from '@dnd-kit/modifiers'
import { AlertTriangle, CheckCircle, Clock, Pause, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { BlurFade } from '#components/ui/blur-fade'
import { MaintenanceCard } from '../cards/maintenance-card'
import { MaintenanceSortableCard } from '../cards/maintenance-sortable-card'
import type { MaintenanceStatus } from '@repo/shared/types/core'
import type { MaintenanceDisplayRequest } from '@repo/shared/types/sections/maintenance'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { apiRequest } from '#lib/api-request'

const logger = createLogger({ component: 'MaintenanceKanban' })

interface ColumnConfig {
	id: MaintenanceStatus
	title: string
	colorClass: string
	icon: ReactNode
}

const COLUMNS: ColumnConfig[] = [
	{
		id: 'open',
		title: 'Open',
		colorClass: 'bg-warning/10',
		icon: <Clock className="w-4 h-4 text-warning" />
	},
	{
		id: 'in_progress',
		title: 'In Progress',
		colorClass: 'bg-primary/10',
		icon: <AlertTriangle className="w-4 h-4 text-primary" />
	},
	{
		id: 'completed',
		title: 'Completed',
		colorClass: 'bg-success/10',
		icon: <CheckCircle className="w-4 h-4 text-success" />
	},
	{
		id: 'on_hold',
		title: 'On Hold',
		colorClass: 'bg-muted',
		icon: <Pause className="w-4 h-4 text-muted-foreground" />
	},
	{
		id: 'cancelled',
		title: 'Cancelled',
		colorClass: 'bg-muted',
		icon: <XCircle className="w-4 h-4 text-muted-foreground" />
	}
]

function getDaysOpen(timestamp: string | null | undefined): number {
	if (!timestamp) return 0
	const date = new Date(timestamp)
	const now = new Date()
	const diff = now.getTime() - date.getTime()
	return Math.floor(diff / (1000 * 60 * 60 * 24))
}

interface KanbanColumnProps {
	column: ColumnConfig
	requests: MaintenanceDisplayRequest[]
	columnIndex: number
	onView: (id: string) => void
}

function KanbanColumn({
	column,
	requests,
	columnIndex,
	onView
}: KanbanColumnProps) {
	// Sort by age (oldest first for open/in_progress, newest first for completed)
	const sortedRequests = [...requests].sort((a, b) => {
		if (column.id === 'completed' || column.id === 'cancelled') {
			return getDaysOpen(a.created_at) - getDaysOpen(b.created_at)
		}
		return getDaysOpen(b.created_at) - getDaysOpen(a.created_at)
	})

	return (
		<BlurFade delay={0.3 + columnIndex * 0.1} inView>
			<div className="flex flex-col min-w-[300px] w-[300px] bg-muted/30 rounded-lg">
				{/* Column Header */}
				<div className="flex items-center gap-3 p-4 border-b border-border">
					<div
						className={`w-8 h-8 rounded-lg flex items-center justify-center ${column.colorClass}`}
					>
						{column.icon}
					</div>
					<div className="flex-1">
						<h3 className="font-medium text-foreground">{column.title}</h3>
					</div>
					<span className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium text-muted-foreground">
						{requests.length}
					</span>
				</div>

				{/* Cards Container */}
				<div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-380px)]">
					<SortableContext
						id={column.id}
						items={sortedRequests.map(r => r.id)}
						strategy={verticalListSortingStrategy}
					>
						{sortedRequests.map((request, idx) => (
							<BlurFade
								key={request.id}
								delay={0.4 + columnIndex * 0.1 + idx * 0.03}
								inView
							>
								<MaintenanceSortableCard
									request={request}
									columnId={column.id}
									onView={onView}
								/>
							</BlurFade>
						))}
					</SortableContext>

					{requests.length === 0 && (
						<div className="text-center py-8">
							<p className="text-sm text-muted-foreground">No requests</p>
						</div>
					)}
				</div>
			</div>
		</BlurFade>
	)
}

interface MaintenanceKanbanProps {
	initialRequests: MaintenanceDisplayRequest[]
}

export function MaintenanceKanban({ initialRequests }: MaintenanceKanbanProps) {
	const router = useRouter()
	const [requests, setRequests] = useState<MaintenanceDisplayRequest[]>(
		initialRequests || []
	)
	const [activeRequest, setActiveRequest] =
		useState<MaintenanceDisplayRequest | null>(null)
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

	// Group requests by status
	const requestsByStatus = (requests || []).reduce(
		(acc, request) => {
			const status = request.status as MaintenanceStatus
			if (status && !acc[status]) acc[status] = []
			if (status) acc[status].push(request)
			return acc
		},
		{} as Record<MaintenanceStatus, MaintenanceDisplayRequest[]>
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
						completed_at:
							newStatus === 'completed' ? new Date().toISOString() : undefined
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

	const handleViewRequest = (id: string) => {
		router.push(`/maintenance/${id}`)
	}

	// Filter out columns with no requests except for the main ones
	const visibleColumns = COLUMNS.filter(column => {
		const count = requestsByStatus[column.id]?.length ?? 0
		// Always show Open, In Progress, and Completed
		if (['open', 'in_progress', 'completed'].includes(column.id)) {
			return true
		}
		// Only show On Hold and Cancelled if they have requests
		return count > 0
	})

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			modifiers={[snapToGrid, restrictToWindowEdges]}
		>
			<div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 lg:-mx-8 lg:px-8">
				{visibleColumns.map((column, idx) => (
					<KanbanColumn
						key={column.id}
						column={column}
						requests={requestsByStatus[column.id] || []}
						columnIndex={idx}
						onView={handleViewRequest}
					/>
				))}
			</div>

			<DragOverlay>
				{activeRequest ? (
					<MaintenanceCard request={activeRequest} isDragging />
				) : null}
			</DragOverlay>
		</DndContext>
	)
}
