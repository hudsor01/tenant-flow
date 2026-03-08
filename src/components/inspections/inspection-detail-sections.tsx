'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { useCreateInspectionRoom } from '#hooks/api/use-inspection-room-mutations'

export const ROOM_TYPES = [
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

export function AddRoomForm({ inspectionId, onCancel }: AddRoomFormProps) {
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
