/**
 * Inspection Validation Schemas
 *
 * Zod schemas for move-in/move-out inspection system.
 * Used by both backend DTOs (nestjs-zod) and frontend forms.
 */

import { z } from "zod";

const inspectionTypeSchema = z.enum(["move_in", "move_out"]);

const inspectionStatusSchema = z.enum([
	"pending",
	"in_progress",
	"completed",
	"tenant_reviewing",
	"finalized",
]);

const roomTypeSchema = z.enum([
	"bedroom",
	"bathroom",
	"kitchen",
	"living_room",
	"dining_room",
	"garage",
	"outdoor",
	"other",
]);

const conditionRatingSchema = z.enum([
	"excellent",
	"good",
	"fair",
	"poor",
	"damaged",
]);

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

export type InspectionType = z.infer<typeof inspectionTypeSchema>;
export type InspectionStatus = z.infer<typeof inspectionStatusSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type ConditionRating = z.infer<typeof conditionRatingSchema>;
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
