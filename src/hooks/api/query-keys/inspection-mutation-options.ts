import { mutationOptions } from "@tanstack/react-query";
import { omitUndefined } from "#lib/db-insert";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { requireOwnerUserId } from "#lib/require-owner-user-id";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type {
	CreateInspectionInput,
	CreateInspectionRoomInput,
	TenantReviewInput,
	UpdateInspectionInput,
	UpdateInspectionRoomInput,
} from "#lib/validation/inspections";
import type { Inspection } from "#types/sections/inspections";
import type { Tables } from "#types/supabase";

export interface RecordPhotoInput {
	inspection_room_id: string;
	inspection_id: string;
	storage_path: string;
	file_name: string;
	file_size?: number;
	mime_type: string;
	caption?: string;
}

const INSPECTION_TYPES = ["move_in", "move_out"] as const;
const INSPECTION_STATUSES = [
	"pending",
	"in_progress",
	"completed",
	"tenant_reviewing",
	"finalized",
] as const;

type InspectionType = (typeof INSPECTION_TYPES)[number];
type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

// Narrows the DB row's `inspection_type` / `status: string` to the literal
// unions the Inspection interface promises. DB CHECK constraints guarantee
// the values at insert/update time; we reject anything else explicitly
// rather than silently coercing.
function toInspection(row: Tables<"inspections">): Inspection {
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

export const inspectionMutations = {
	create: () =>
		mutationOptions({
			mutationFn: async (dto: CreateInspectionInput): Promise<Inspection> => {
				const supabase = createClient();
				const user = await getCachedUser();
				const ownerId = requireOwnerUserId(user?.id);

				const { data: created, error } = await supabase
					.from("inspections")
					.insert(omitUndefined({ ...dto, owner_user_id: ownerId }))
					.select()
					.single();

				if (error) handlePostgrestError(error, "inspections");
				return toInspection(created);
			},
		}),

	update: (id: string) =>
		mutationOptions({
			mutationFn: async (dto: UpdateInspectionInput): Promise<Inspection> => {
				const supabase = createClient();
				const { data: updated, error } = await supabase
					.from("inspections")
					.update(omitUndefined(dto))
					.eq("id", id)
					.select()
					.single();

				if (error) handlePostgrestError(error, "inspections");
				return toInspection(updated);
			},
		}),

	complete: (id: string) =>
		mutationOptions({
			mutationFn: async (): Promise<Inspection> => {
				const supabase = createClient();

				const { data: rooms, error: roomsError } = await supabase
					.from("inspection_rooms")
					.select("id, condition_rating")
					.eq("inspection_id", id);

				if (roomsError) handlePostgrestError(roomsError, "inspection_rooms");

				const unassessed = (rooms ?? []).filter((r) => !r.condition_rating);
				if (unassessed.length > 0) {
					throw new Error(
						`All rooms must be assessed before completing. ${unassessed.length} room(s) have no condition rating.`,
					);
				}

				const { data: updated, error } = await supabase
					.from("inspections")
					.update({
						status: "completed",
						completed_at: new Date().toISOString(),
					})
					.eq("id", id)
					.select()
					.single();

				if (error) handlePostgrestError(error, "inspections");
				return toInspection(updated);
			},
		}),

	submitForReview: (id: string) =>
		mutationOptions({
			mutationFn: async (): Promise<Inspection> => {
				const supabase = createClient();
				const { data: updated, error } = await supabase
					.from("inspections")
					.update({ status: "tenant_reviewing" })
					.eq("id", id)
					.select()
					.single();

				if (error) handlePostgrestError(error, "inspections");
				return toInspection(updated);
			},
		}),

	tenantReview: (id: string) =>
		mutationOptions({
			mutationFn: async (dto: TenantReviewInput): Promise<Inspection> => {
				const supabase = createClient();
				const { data: updated, error } = await supabase
					.from("inspections")
					.update(
						omitUndefined({
							...dto,
							status: "finalized",
							tenant_reviewed_at: new Date().toISOString(),
						}),
					)
					.eq("id", id)
					.select()
					.single();

				if (error) handlePostgrestError(error, "inspections");
				return toInspection(updated);
			},
		}),

	delete: () =>
		mutationOptions({
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient();
				const { error } = await supabase
					.from("inspections")
					.delete()
					.eq("id", id);

				if (error) handlePostgrestError(error, "inspections");
			},
		}),

	createRoom: () =>
		mutationOptions({
			mutationFn: async (dto: CreateInspectionRoomInput) => {
				const supabase = createClient();
				const { data: created, error } = await supabase
					.from("inspection_rooms")
					.insert(omitUndefined(dto))
					.select()
					.single();

				if (error) handlePostgrestError(error, "inspection_rooms");
				return created;
			},
		}),

	updateRoom: (roomId: string) =>
		mutationOptions({
			mutationFn: async (dto: UpdateInspectionRoomInput): Promise<void> => {
				const supabase = createClient();
				const { error } = await supabase
					.from("inspection_rooms")
					.update(omitUndefined(dto))
					.eq("id", roomId);

				if (error) handlePostgrestError(error, "inspection_rooms");
			},
		}),

	deleteRoom: () =>
		mutationOptions({
			mutationFn: async (roomId: string): Promise<void> => {
				const supabase = createClient();

				const { data: photos } = await supabase
					.from("inspection_photos")
					.select("storage_path")
					.eq("inspection_room_id", roomId);

				const { error } = await supabase
					.from("inspection_rooms")
					.delete()
					.eq("id", roomId);

				if (error) handlePostgrestError(error, "inspection_rooms");

				if (photos && photos.length > 0) {
					const storagePaths = photos.map((p) => p.storage_path);
					try {
						await supabase.storage
							.from("inspection-photos")
							.remove(storagePaths);
					} catch {
						// Non-blocking storage cleanup
					}
				}
			},
		}),

	recordPhoto: () =>
		mutationOptions({
			mutationFn: async (dto: RecordPhotoInput) => {
				const supabase = createClient();
				const { data: photo, error } = await supabase
					.from("inspection_photos")
					.insert(dto)
					.select()
					.single();

				if (error) {
					try {
						await supabase.storage
							.from("inspection-photos")
							.remove([dto.storage_path]);
					} catch {
						// Non-blocking storage cleanup
					}
					handlePostgrestError(error, "inspection_photos");
				}

				return photo;
			},
		}),

	deletePhoto: () =>
		mutationOptions({
			mutationFn: async (photoId: string): Promise<void> => {
				const supabase = createClient();

				const { data: photo } = await supabase
					.from("inspection_photos")
					.select("storage_path")
					.eq("id", photoId)
					.single();

				const { error: dbError } = await supabase
					.from("inspection_photos")
					.delete()
					.eq("id", photoId);

				if (dbError) handlePostgrestError(dbError, "inspection_photos");

				if (photo?.storage_path) {
					try {
						await supabase.storage
							.from("inspection-photos")
							.remove([photo.storage_path]);
					} catch {
						// Non-blocking storage cleanup
					}
				}
			},
		}),
};
