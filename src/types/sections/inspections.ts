/**
 * Inspection Domain Types
 *
 * Types for the move-in/move-out inspection system.
 * These match the database schema for inspections, inspection_rooms, and inspection_photos.
 */

export const INSPECTION_TYPES = ["move_in", "move_out"] as const;
export const INSPECTION_STATUSES = [
	"pending",
	"in_progress",
	"completed",
	"tenant_reviewing",
	"finalized",
] as const;
export const ROOM_TYPES = [
	"bedroom",
	"bathroom",
	"kitchen",
	"living_room",
	"dining_room",
	"garage",
	"outdoor",
	"other",
] as const;
export const CONDITION_RATINGS = [
	"excellent",
	"good",
	"fair",
	"poor",
	"damaged",
] as const;

export type InspectionType = (typeof INSPECTION_TYPES)[number];
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];
export type RoomType = (typeof ROOM_TYPES)[number];
export type ConditionRating = (typeof CONDITION_RATINGS)[number];

/**
 * Runtime type guards for the DB CHECK-constrained inspection enums. Each
 * narrows a raw `string` to its literal union so callers avoid `as` casts.
 */
export function isInspectionType(value: string): value is InspectionType {
	return (INSPECTION_TYPES as readonly string[]).includes(value);
}
export function isInspectionStatus(value: string): value is InspectionStatus {
	return (INSPECTION_STATUSES as readonly string[]).includes(value);
}
export function isRoomType(value: string): value is RoomType {
	return (ROOM_TYPES as readonly string[]).includes(value);
}
export function isConditionRating(value: string): value is ConditionRating {
	return (CONDITION_RATINGS as readonly string[]).includes(value);
}

/**
 * Narrows the DB row's `inspection_type` / `status: string` columns to the
 * literal unions the Inspection interface promises. DB CHECK constraints
 * guarantee the values at insert/update time; reject anything else
 * explicitly so a drift event surfaces loudly instead of corrupting
 * downstream consumers.
 */
export function narrowInspectionEnums<
	T extends { id: string; inspection_type: string; status: string },
>(row: T): T & { inspection_type: InspectionType; status: InspectionStatus } {
	if (!isInspectionType(row.inspection_type)) {
		throw new Error(
			`Unexpected inspection_type "${row.inspection_type}" on inspection ${row.id}`,
		);
	}
	if (!isInspectionStatus(row.status)) {
		throw new Error(
			`Unexpected status "${row.status}" on inspection ${row.id}`,
		);
	}
	return {
		...row,
		inspection_type: row.inspection_type,
		status: row.status,
	};
}

/**
 * Narrows an inspection_rooms row's `room_type` / `condition_rating: string`
 * columns to their literal unions. Both columns are DB CHECK-constrained, so
 * reject drift loudly rather than silently passing an out-of-union value to
 * the UI exhaustiveness switches.
 */
export function narrowInspectionRoomEnums<
	T extends { id: string; room_type: string; condition_rating: string },
>(room: T): T & { room_type: RoomType; condition_rating: ConditionRating } {
	if (!isRoomType(room.room_type)) {
		throw new Error(
			`Unexpected room_type "${room.room_type}" on inspection room ${room.id}`,
		);
	}
	if (!isConditionRating(room.condition_rating)) {
		throw new Error(
			`Unexpected condition_rating "${room.condition_rating}" on inspection room ${room.id}`,
		);
	}
	return {
		...room,
		room_type: room.room_type,
		condition_rating: room.condition_rating,
	};
}

export interface InspectionPhoto {
	id: string;
	inspection_room_id: string;
	inspection_id: string;
	storage_path: string;
	file_name: string;
	file_size: number | null;
	mime_type: string;
	caption: string | null;
	uploaded_by: string | null;
	created_at: string;
	publicUrl?: string;
}

export interface InspectionRoom {
	id: string;
	inspection_id: string;
	room_name: string;
	room_type: RoomType;
	condition_rating: ConditionRating;
	notes: string | null;
	created_at: string;
	updated_at: string;
	photos?: InspectionPhoto[];
}

export interface Inspection {
	id: string;
	lease_id: string;
	property_id: string;
	unit_id: string | null;
	owner_user_id: string;
	inspection_type: InspectionType;
	status: InspectionStatus;
	scheduled_date: string | null;
	completed_at: string | null;
	tenant_reviewed_at: string | null;
	tenant_signature_data: string | null;
	overall_condition: string | null;
	owner_notes: string | null;
	tenant_notes: string | null;
	created_at: string;
	updated_at: string;
	rooms?: InspectionRoom[];
	property?: { name: string; address_line1: string } | null;
	unit?: { name: string } | null;
}

export interface InspectionListItem {
	id: string;
	lease_id: string;
	property_id: string;
	inspection_type: InspectionType;
	status: InspectionStatus;
	scheduled_date: string | null;
	completed_at: string | null;
	created_at: string;
	property_name: string;
	unit_name: string | null;
	room_count: number;
}
