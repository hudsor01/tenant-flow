/**
 * Inspection Validation Schemas
 *
 * Zod schemas for move-in/move-out inspection system.
 * Used by both backend DTOs (nestjs-zod) and frontend forms.
 */

import { z } from "zod";
import {
	CONDITION_RATINGS,
	INSPECTION_STATUSES,
	INSPECTION_TYPES,
	ROOM_TYPES,
} from "#types/sections/inspections";

// Derive Zod enums from the single source-of-truth const arrays in
// #types/sections/inspections so the validation layer and the runtime type
// guards / narrowers can never drift apart.
const inspectionTypeSchema = z.enum(INSPECTION_TYPES);
const inspectionStatusSchema = z.enum(INSPECTION_STATUSES);
const roomTypeSchema = z.enum(ROOM_TYPES);
const conditionRatingSchema = z.enum(CONDITION_RATINGS);

const createInspectionSchema = z.object({
	lease_id: z.string().uuid(),
	property_id: z.string().uuid(),
	unit_id: z.string().uuid().optional().nullable(),
	inspection_type: inspectionTypeSchema,
	scheduled_date: z.string().optional().nullable(),
});

const updateInspectionSchema = z.object({
	status: inspectionStatusSchema.optional(),
	scheduled_date: z.string().optional().nullable(),
	completed_at: z.string().optional().nullable(),
	overall_condition: z.string().max(2000).optional().nullable(),
	owner_notes: z.string().max(5000).optional().nullable(),
	tenant_notes: z.string().max(5000).optional().nullable(),
	tenant_reviewed_at: z.string().optional().nullable(),
	tenant_signature_data: z.string().optional().nullable(),
});

const createInspectionRoomSchema = z.object({
	inspection_id: z.string().uuid(),
	room_name: z.string().min(1).max(100),
	room_type: roomTypeSchema,
	condition_rating: conditionRatingSchema,
	notes: z.string().max(2000).optional().nullable(),
});

const updateInspectionRoomSchema = z.object({
	room_name: z.string().min(1).max(100).optional(),
	room_type: roomTypeSchema.optional(),
	condition_rating: conditionRatingSchema.optional(),
	notes: z.string().max(2000).optional().nullable(),
});

const createInspectionPhotoSchema = z.object({
	inspection_room_id: z.string().uuid(),
	inspection_id: z.string().uuid(),
	storage_path: z.string().min(1),
	file_name: z.string().min(1),
	file_size: z.number().int().positive().optional(),
	mime_type: z.string(),
	caption: z.string().max(500).optional().nullable(),
});

const tenantReviewSchema = z.object({
	tenant_notes: z.string().max(5000).optional().nullable(),
	tenant_signature_data: z.string().min(1, "Signature is required"),
});

// Scalar enum types (InspectionType/InspectionStatus/RoomType/ConditionRating)
// are the single source-of-truth exports in #types/sections/inspections — do
// not re-declare them here.
export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type UpdateInspectionInput = z.infer<typeof updateInspectionSchema>;
export type CreateInspectionRoomInput = z.infer<
	typeof createInspectionRoomSchema
>;
export type UpdateInspectionRoomInput = z.infer<
	typeof updateInspectionRoomSchema
>;
export type CreateInspectionPhotoInput = z.infer<
	typeof createInspectionPhotoSchema
>;
export type TenantReviewInput = z.infer<typeof tenantReviewSchema>;
