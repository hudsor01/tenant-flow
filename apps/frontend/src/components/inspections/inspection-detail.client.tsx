'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
	ArrowLeft,
	Plus,
	CheckCircle,
	Send,
	Loader2
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { Label } from '#components/ui/label'
import { Textarea } from '#components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Skeleton } from '#components/ui/skeleton'
import {
	useInspection,
	useUpdateInspection,
	useCompleteInspection,
	useSubmitForTenantReview,
	useCreateInspectionRoom
} from '#hooks/api/use-inspections'
import { InspectionRoomCard } from './inspection-room-card'
import { formatDate } from '#lib/formatters/date'

const STATUS_LABELS: Record<string, string> = {
	pending: 'Pending',
	in_progress: 'In Progress',
	completed: 'Completed',
	tenant_reviewing: 'Tenant Reviewing',
	finalized: 'Finalized'
}

type StatusVariant = 'secondary' | 'default' | 'success' | 'info' | 'warning' | 'outline'

function statusVariant(status: string): StatusVariant {
	switch (status) {
		case 'pending':
			return 'secondary'
		case 'in_progress':
			return 'default'
		case 'completed':
			return 'success'
		case 'tenant_reviewing':
			return 'warning'
		case 'finalized':
			return 'info'
		default:
			return 'outline'
	}
}

const ROOM_TYPES = [
	{ value: 'bedroom', label: 'Bedroom' },
	{ value: 'bathroom', label: 'Bathroom' },
	{ value: 'kitchen', label: 'Kitchen' },
	{ value: 'living_room', label: 'Living Room' },
	{ value: 'dining_room', label: 'Dining Room' },
	{ value: 'garage', label: 'Garage' },
	{ value: 'outdoor', label: 'Outdoor' },
	{ value: 'other', label: 'Other' }
]

interface AddRoomFormProps {
	inspectionId: string
	onCancel: () => void
}

function AddRoomForm({ inspectionId, onCancel }: AddRoomFormProps) {
	const [roomName, setRoomName] = useState('')
	const [roomType, setRoomType] = useState('other')
	const [conditionRating, setConditionRating] = useState('good')
	const createRoom = useCreateInspectionRoom()

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		await createRoom.mutateAsync({
			inspection_id: inspectionId,
			room_name: roomName,
			room_type: roomType as 'bedroom' | 'bathroom' | 'kitchen' | 'living_room' | 'dining_room' | 'garage' | 'outdoor' | 'other',
			condition_rating: conditionRating as 'excellent' | 'good' | 'fair' | 'poor' | 'damaged'
		})
		onCancel()
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="rounded-lg border bg-muted/30 p-4 space-y-4"
		>
			<h3 className="text-sm font-medium">Add Room</h3>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="space-y-2">
					<Label htmlFor="room-name">Room name</Label>
					<input
						id="room-name"
						type="text"
						value={roomName}
						onChange={e => setRoomName(e.target.value)}
						placeholder="e.g. Master Bedroom"
						required
						className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="room-type">Room type</Label>
					<Select value={roomType} onValueChange={setRoomType}>
						<SelectTrigger id="room-type">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ROOM_TYPES.map(t => (
								<SelectItem key={t.value} value={t.value}>
									{t.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="room-condition">Initial condition</Label>
					<Select value={conditionRating} onValueChange={setConditionRating}>
						<SelectTrigger id="room-condition">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="excellent">Excellent</SelectItem>
							<SelectItem value="good">Good</SelectItem>
							<SelectItem value="fair">Fair</SelectItem>
							<SelectItem value="poor">Poor</SelectItem>
							<SelectItem value="damaged">Damaged</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex gap-3">
				<Button
					type="submit"
					size="sm"
					disabled={!roomName || createRoom.isPending}
					className="min-h-9"
				>
					{createRoom.isPending ? 'Adding...' : 'Add Room'}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onCancel}
					className="min-h-9"
				>
					Cancel
				</Button>
			</div>
		</form>
	)
}

export function InspectionDetailClient({ id }: { id: string }) {
	const router = useRouter()
	const { data: inspection, isLoading, error } = useInspection(id)
	const updateInspection = useUpdateInspection(id)
	const completeInspection = useCompleteInspection(id)
	const submitForReview = useSubmitForTenantReview(id)

	const [showAddRoom, setShowAddRoom] = useState(false)
	const [ownerNotes, setOwnerNotes] = useState('')
	const [overallCondition, setOverallCondition] = useState('')
	const [notesInitialized, setNotesInitialized] = useState(false)

	// Initialize form fields once data loads
	if (inspection && !notesInitialized) {
		setOwnerNotes(inspection.owner_notes ?? '')
		setOverallCondition(inspection.overall_condition ?? '')
		setNotesInitialized(true)
	}

	function handleNotesBlur() {
		if (!inspection) return
		const changed =
			ownerNotes !== (inspection.owner_notes ?? '') ||
			overallCondition !== (inspection.overall_condition ?? '')

		if (changed) {
			updateInspection.mutate({
				owner_notes: ownerNotes || null,
				overall_condition: overallCondition || null
			})
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-48 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		)
	}

	if (error || !inspection) {
		return (
			<div className="text-center py-12">
				<p className="text-sm text-destructive">
					Failed to load inspection. Please try again.
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.back()}
					className="mt-4"
				>
					Go Back
				</Button>
			</div>
		)
	}

	const rooms = inspection.rooms ?? []
	const typeLabel =
		inspection.inspection_type === 'move_in' ? 'Move-In' : 'Move-Out'

	const canComplete =
		inspection.status === 'in_progress' || inspection.status === 'pending'
	const canSubmitForReview = inspection.status === 'completed'
	const isFinalized =
		inspection.status === 'finalized' ||
		inspection.status === 'tenant_reviewing'

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-start gap-4">
				<Link
					href="/inspections"
					className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Back to inspections"
				>
					<ArrowLeft className="w-5 h-5" aria-hidden="true" />
				</Link>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-3 flex-wrap">
						<h1 className="text-xl font-semibold">
							{typeLabel} Inspection
						</h1>
						<Badge variant={statusVariant(inspection.status)}>
							{STATUS_LABELS[inspection.status] ?? inspection.status}
						</Badge>
					</div>
					<div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
						<span>
							{(inspection as { property?: { name?: string } }).property?.name ?? 'Property'}
						</span>
						{(inspection as { unit?: { name?: string } }).unit?.name && (
							<>
								<span>·</span>
								<span>
									Unit {(inspection as { unit?: { name?: string } }).unit?.name}
								</span>
							</>
						)}
						{inspection.scheduled_date && (
							<>
								<span>·</span>
								<span>Scheduled {formatDate(inspection.scheduled_date)}</span>
							</>
						)}
						<span>·</span>
						<span>Created {formatDate(inspection.created_at, { relative: true })}</span>
					</div>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-2 shrink-0">
					{canComplete && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => completeInspection.mutate()}
							disabled={completeInspection.isPending}
							className="min-h-9"
						>
							{completeInspection.isPending ? (
								<Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
							) : (
								<CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
							)}
							Mark Complete
						</Button>
					)}

					{canSubmitForReview && (
						<Button
							size="sm"
							onClick={() => submitForReview.mutate()}
							disabled={submitForReview.isPending}
							className="min-h-9"
						>
							{submitForReview.isPending ? (
								<Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
							) : (
								<Send className="w-4 h-4 mr-2" aria-hidden="true" />
							)}
							Send for Review
						</Button>
					)}
				</div>
			</div>

			{/* Overview notes */}
			<div className="rounded-lg border bg-card p-6 space-y-4">
				<h2 className="text-base font-medium">Overview</h2>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="overall-condition">Overall condition</Label>
						<input
							id="overall-condition"
							type="text"
							value={overallCondition}
							onChange={e => setOverallCondition(e.target.value)}
							onBlur={handleNotesBlur}
							placeholder="e.g. Good overall condition"
							disabled={isFinalized}
							className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="owner-notes">Owner notes</Label>
					<Textarea
						id="owner-notes"
						value={ownerNotes}
						onChange={e => setOwnerNotes(e.target.value)}
						onBlur={handleNotesBlur}
						placeholder="Add any notes about this inspection..."
						rows={3}
						disabled={isFinalized}
					/>
				</div>

				{inspection.tenant_notes && (
					<div className="space-y-2 p-3 bg-muted/30 rounded-md">
						<Label>Tenant notes</Label>
						<p className="text-sm text-muted-foreground whitespace-pre-wrap">
							{inspection.tenant_notes}
						</p>
						{inspection.tenant_reviewed_at && (
							<p className="text-xs text-muted-foreground">
								Reviewed {formatDate(inspection.tenant_reviewed_at, { relative: true })}
							</p>
						)}
					</div>
				)}
			</div>

			{/* Rooms */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-base font-medium">
						Rooms ({rooms.length})
					</h2>
					{!isFinalized && (
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => setShowAddRoom(v => !v)}
							className="min-h-9"
						>
							<Plus className="w-4 h-4 mr-2" aria-hidden="true" />
							Add Room
						</Button>
					)}
				</div>

				{showAddRoom && !isFinalized && (
					<AddRoomForm
						inspectionId={id}
						onCancel={() => setShowAddRoom(false)}
					/>
				)}

				{rooms.length === 0 && !showAddRoom && (
					<div className="rounded-lg border border-dashed p-8 text-center">
						<p className="text-sm text-muted-foreground">
							No rooms added yet. Add rooms to document the condition of each area.
						</p>
					</div>
				)}

				{rooms.map(room => (
					<InspectionRoomCard
						key={room.id}
						room={room}
						inspectionId={id}
					/>
				))}
			</div>
		</div>
	)
}
