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

export type InspectionType = (typeof INSPECTION_TYPES)[number];
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

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
	if (!INSPECTION_TYPES.includes(row.inspection_type as InspectionType)) {
		throw new Error(
			`Unexpected inspection_type "${row.inspection_type}" on inspection ${row.id}`,
		);
	}
	if (!INSPECTION_STATUSES.includes(row.status as InspectionStatus)) {
		throw new Error(
			`Unexpected status "${row.status}" on inspection ${row.id}`,
		);
	}
	return {
		...row,
		inspection_type: row.inspection_type as InspectionType,
		status: row.status as InspectionStatus,
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
	room_type: string;
	condition_rating: string;
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
	status: string;
	scheduled_date: string | null;
	completed_at: string | null;
	created_at: string;
	property_name: string;
	unit_name: string | null;
	room_count: number;
}
