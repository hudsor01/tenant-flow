'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2, Camera } from 'lucide-react'
import { Button } from '#components/ui/button'
import { Label } from '#components/ui/label'
import { Textarea } from '#components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Badge } from '#components/ui/badge'
import {
	useUpdateInspectionRoom,
	useDeleteInspectionRoom
} from '#hooks/api/use-inspections'
import { InspectionPhotoUpload } from './inspection-photo-upload'
import type { InspectionRoom } from '@repo/shared/types/sections/inspections'

interface InspectionRoomCardProps {
	room: InspectionRoom
	inspectionId: string
}

const CONDITION_LABELS: Record<string, string> = {
	excellent: 'Excellent',
	good: 'Good',
	fair: 'Fair',
	poor: 'Poor',
	damaged: 'Damaged'
}

const ROOM_TYPE_LABELS: Record<string, string> = {
	bedroom: 'Bedroom',
	bathroom: 'Bathroom',
	kitchen: 'Kitchen',
	living_room: 'Living Room',
	dining_room: 'Dining Room',
	garage: 'Garage',
	outdoor: 'Outdoor',
	other: 'Other'
}

function conditionVariant(
	rating: string
): 'success' | 'info' | 'warning' | 'destructive' | 'outline' {
	switch (rating) {
		case 'excellent':
			return 'success'
		case 'good':
			return 'info'
		case 'fair':
			return 'warning'
		case 'poor':
			return 'destructive'
		case 'damaged':
			return 'destructive'
		default:
			return 'outline'
	}
}

export function InspectionRoomCard({
	room,
	inspectionId
}: InspectionRoomCardProps) {
	const [isExpanded, setIsExpanded] = useState(true)
	const [notes, setNotes] = useState(room.notes ?? '')
	const [conditionRating, setConditionRating] = useState(
		room.condition_rating
	)
	const [showPhotoUpload, setShowPhotoUpload] = useState(false)

	const updateRoom = useUpdateInspectionRoom(inspectionId)
	const deleteRoom = useDeleteInspectionRoom(inspectionId)

	function handleConditionChange(value: string) {
		setConditionRating(value)
		updateRoom.mutate({
			roomId: room.id,
			dto: { condition_rating: value as 'excellent' | 'good' | 'fair' | 'poor' | 'damaged' }
		})
	}

	function handleNotesBlur() {
		if (notes !== (room.notes ?? '')) {
			updateRoom.mutate({
				roomId: room.id,
				dto: { notes: notes || null }
			})
		}
	}

	function handleDelete() {
		if (confirm(`Remove room "${room.room_name}"?`)) {
			deleteRoom.mutate(room.id)
		}
	}

	const photos = room.photos ?? []

	return (
		<div className="rounded-lg border bg-card">
			{/* Room header */}
			<div className="flex items-center justify-between p-4">
				<div className="flex items-center gap-3 min-w-0">
					<button
						type="button"
						onClick={() => setIsExpanded(v => !v)}
						aria-label={isExpanded ? 'Collapse room' : 'Expand room'}
						className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
					>
						{isExpanded ? (
							<ChevronUp className="w-4 h-4" />
						) : (
							<ChevronDown className="w-4 h-4" />
						)}
					</button>
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<span className="font-medium text-sm truncate">
								{room.room_name}
							</span>
							<span className="text-xs text-muted-foreground">
								{ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
							</span>
						</div>
						<div className="flex items-center gap-2 mt-1">
							<Badge variant={conditionVariant(conditionRating)} size="sm">
								{CONDITION_LABELS[conditionRating] ?? conditionRating}
							</Badge>
							{photos.length > 0 && (
								<span className="text-xs text-muted-foreground flex items-center gap-1">
									<Camera className="w-3 h-3" aria-hidden="true" />
									{photos.length}
								</span>
							)}
						</div>
					</div>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleDelete}
					disabled={deleteRoom.isPending}
					className="shrink-0 text-muted-foreground hover:text-destructive"
					aria-label={`Delete room ${room.room_name}`}
				>
					<Trash2 className="w-4 h-4" aria-hidden="true" />
				</Button>
			</div>

			{/* Expanded content */}
			{isExpanded && (
				<div className="px-4 pb-4 space-y-4 border-t pt-4">
					{/* Condition rating */}
					<div className="space-y-2">
						<Label htmlFor={`condition-${room.id}`}>Condition</Label>
						<Select
							value={conditionRating}
							onValueChange={handleConditionChange}
						>
							<SelectTrigger
								id={`condition-${room.id}`}
								className="w-full max-w-xs"
							>
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

					{/* Notes */}
					<div className="space-y-2">
						<Label htmlFor={`notes-${room.id}`}>Notes</Label>
						<Textarea
							id={`notes-${room.id}`}
							value={notes}
							onChange={e => setNotes(e.target.value)}
							onBlur={handleNotesBlur}
							placeholder="Describe the condition, any damage, or items to note..."
							rows={3}
						/>
					</div>

					{/* Photos */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label>Photos ({photos.length})</Label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setShowPhotoUpload(v => !v)}
								className="min-h-9"
							>
								<Camera className="w-4 h-4 mr-2" aria-hidden="true" />
								{showPhotoUpload ? 'Hide Upload' : 'Add Photos'}
							</Button>
						</div>

						{/* Existing photos */}
						{photos.length > 0 && (
							<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
								{photos.map(photo => (
									<div
										key={photo.id}
										className="aspect-square rounded-md bg-muted overflow-hidden relative group"
									>
										<img
											src={`/api/v1/inspections/photos/${photo.id}/url`}
											alt={photo.file_name}
											className="w-full h-full object-cover"
											loading="lazy"
										/>
										{photo.caption && (
											<div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
												<p className="text-white text-xs truncate">
													{photo.caption}
												</p>
											</div>
										)}
									</div>
								))}
							</div>
						)}

						{/* Upload area */}
						{showPhotoUpload && (
							<InspectionPhotoUpload
								inspectionId={inspectionId}
								roomId={room.id}
								onUploadComplete={() => setShowPhotoUpload(false)}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
