/**
 * Inspection Query Keys & Options
 * Extracted to avoid circular dependencies and enable reuse across files
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - PostgREST direct via supabase-js (no apiRequest calls)
 */

import { queryOptions } from "@tanstack/react-query";
import { QUERY_CACHE_TIMES } from "#lib/constants/query-config";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import {
	type Inspection,
	type InspectionListItem,
	narrowInspectionEnums,
	narrowInspectionRoomEnums,
} from "#types/sections/inspections";

const INSPECTION_SELECT_COLUMNS =
	"id, lease_id, property_id, unit_id, owner_user_id, inspection_type, status, scheduled_date, completed_at, tenant_reviewed_at, tenant_signature_data, overall_condition, owner_notes, tenant_notes, created_at, updated_at";

const INSPECTION_DETAIL_SELECT =
	"id, lease_id, property_id, unit_id, owner_user_id, inspection_type, status, scheduled_date, completed_at, tenant_reviewed_at, tenant_signature_data, overall_condition, owner_notes, tenant_notes, created_at, updated_at, inspection_rooms(id, inspection_id, room_name, room_type, condition_rating, notes, created_at, updated_at, inspection_photos(id, inspection_room_id, inspection_id, storage_path, file_name, file_size, mime_type, caption, uploaded_by, created_at))";

/**
 * Inspection query factory
 */
export const inspectionQueries = {
	all: () => ["inspections"] as const,
	lists: () => [...inspectionQueries.all(), "list"] as const,
	byLease: (leaseId: string) =>
		[...inspectionQueries.all(), "lease", leaseId] as const,
	details: () => [...inspectionQueries.all(), "detail"] as const,
	detail: (id: string) => [...inspectionQueries.details(), id] as const,

	list: () =>
		queryOptions({
			queryKey: inspectionQueries.lists(),
			queryFn: async (): Promise<InspectionListItem[]> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("inspections")
					.select(
						`${INSPECTION_SELECT_COLUMNS}, properties(name, address_line1), units(unit_number), inspection_rooms(id)`,
						{ count: "exact" },
					)
					.order("created_at", { ascending: false });

				if (error) handlePostgrestError(error, "inspections");

				return (data ?? []).map((row): InspectionListItem => {
					// PostgREST returns embedded relations as nested objects when
					// the column is a single-target FK; the typed client narrows
					// these, but the optional embeds (one-to-one with NULL) come
					// back as `T | null`. No `as unknown as` needed once the
					// browser client carries the Database generic.
					const property = row.properties;
					const unit = row.units;
					const rooms = row.inspection_rooms;

					const narrowed = narrowInspectionEnums(row);
					return {
						id: narrowed.id,
						lease_id: narrowed.lease_id,
						property_id: narrowed.property_id,
						inspection_type: narrowed.inspection_type,
						status: narrowed.status,
						scheduled_date: narrowed.scheduled_date,
						completed_at: narrowed.completed_at,
						// inspections.created_at is NOT NULL DEFAULT now() -- no
						// fallback needed.
						created_at: narrowed.created_at,
						property_name: property?.name ?? "",
						unit_name: unit?.unit_number ?? null,
						room_count: rooms?.length ?? 0,
					};
				});
			},
			...QUERY_CACHE_TIMES.LIST,
		}),

	byLeaseQuery: (leaseId: string) =>
		queryOptions({
			queryKey: inspectionQueries.byLease(leaseId),
			queryFn: async (): Promise<Inspection[]> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("inspections")
					.select(INSPECTION_SELECT_COLUMNS)
					.eq("lease_id", leaseId)
					.order("created_at", { ascending: true });

				if (error) handlePostgrestError(error, "inspections");

				return (data ?? []).map(narrowInspectionEnums);
			},
			enabled: !!leaseId,
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	detailQuery: (id: string) =>
		queryOptions({
			queryKey: inspectionQueries.detail(id),
			queryFn: async (): Promise<Inspection> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("inspections")
					.select(INSPECTION_DETAIL_SELECT)
					.eq("id", id)
					.single();

				if (error) handlePostgrestError(error, "inspections");
				if (!data) {
					throw new Error(`Inspection ${id} not found`);
				}

				// Strip the raw PostgREST `inspection_rooms` embed -- the
				// Inspection contract exposes the enriched `rooms` field
				// (photos resolved to publicUrl) instead.
				const { inspection_rooms, ...rest } = data;
				const rooms = (inspection_rooms ?? []).map((room) => ({
					...narrowInspectionRoomEnums(room),
					photos: (room.inspection_photos ?? []).map((photo) => {
						const { data: urlData } = supabase.storage
							.from("inspection-photos")
							.getPublicUrl(photo.storage_path);
						return {
							...photo,
							publicUrl: urlData.publicUrl,
						};
					}),
				}));

				const narrowed = narrowInspectionEnums(rest);
				return {
					...narrowed,
					rooms,
				};
			},
			enabled: !!id,
			...QUERY_CACHE_TIMES.DETAIL,
		}),
};
