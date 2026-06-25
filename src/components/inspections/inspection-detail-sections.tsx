"use client";

import { useState } from "react";
import { Button } from "#components/ui/button";
import { Label } from "#components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { useCreateInspectionRoom } from "#hooks/api/use-inspection-room-mutations";
import {
	CONDITION_RATINGS,
	type ConditionRating,
	isConditionRating,
	isRoomType,
	ROOM_TYPES,
	type RoomType,
} from "#types/sections/inspections";
import { CONDITION_RATING_LABELS, ROOM_TYPE_LABELS } from "./inspection-labels";

interface AddRoomFormProps {
	inspectionId: string;
	onCancel: () => void;
}

export function AddRoomForm({ inspectionId, onCancel }: AddRoomFormProps) {
	const [roomName, setRoomName] = useState("");
	const [roomType, setRoomType] = useState<RoomType>("other");
	const [conditionRating, setConditionRating] =
		useState<ConditionRating>("good");
	const createRoom = useCreateInspectionRoom();

	// Select options are statically the union members; the guards narrow the
	// `string` event payload back to the union without an `as` cast.
	function handleRoomTypeChange(value: string) {
		if (isRoomType(value)) setRoomType(value);
	}
	function handleConditionChange(value: string) {
		if (isConditionRating(value)) setConditionRating(value);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		await createRoom.mutateAsync({
			inspection_id: inspectionId,
			room_name: roomName,
			room_type: roomType,
			condition_rating: conditionRating,
		});
		onCancel();
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
						onChange={(e) => setRoomName(e.target.value)}
						placeholder="e.g. Master Bedroom"
						required
						className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="room-type">Room type</Label>
					<Select value={roomType} onValueChange={handleRoomTypeChange}>
						<SelectTrigger id="room-type">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ROOM_TYPES.map((value) => (
								<SelectItem key={value} value={value}>
									{ROOM_TYPE_LABELS[value]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="room-condition">Initial condition</Label>
					<Select value={conditionRating} onValueChange={handleConditionChange}>
						<SelectTrigger id="room-condition">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CONDITION_RATINGS.map((value) => (
								<SelectItem key={value} value={value}>
									{CONDITION_RATING_LABELS[value]}
								</SelectItem>
							))}
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
					{createRoom.isPending ? "Adding..." : "Add Room"}
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
	);
}
