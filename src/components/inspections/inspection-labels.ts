/**
 * Display labels for the inspection enums.
 *
 * Single source of truth for the human-readable copy of each DB
 * CHECK-constrained inspection value. Typed as `Record<Union, string>` so the
 * compiler forces a label for every member — adding a new status/room type/
 * rating to the union in #types/sections/inspections is a build error here
 * until its label is supplied.
 */
import type {
	ConditionRating,
	InspectionStatus,
	RoomType,
} from "#types/sections/inspections";

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
	pending: "Pending",
	in_progress: "In Progress",
	completed: "Completed",
	tenant_reviewing: "Tenant Reviewing",
	finalized: "Finalized",
};

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
	bedroom: "Bedroom",
	bathroom: "Bathroom",
	kitchen: "Kitchen",
	living_room: "Living Room",
	dining_room: "Dining Room",
	garage: "Garage",
	outdoor: "Outdoor",
	other: "Other",
};

export const CONDITION_RATING_LABELS: Record<ConditionRating, string> = {
	excellent: "Excellent",
	good: "Good",
	fair: "Fair",
	poor: "Poor",
	damaged: "Damaged",
};
