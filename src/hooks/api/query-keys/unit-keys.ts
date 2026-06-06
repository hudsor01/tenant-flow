/**
 * Unit Query Keys, Options & Mutations
 * Query and mutation factories for unit domain.
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - mutationOptions() for type-safe mutation configuration
 * - Query key factory for consistent cache management
 * - PostgREST direct via supabase-js (no apiRequest calls)
 */

import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { QUERY_CACHE_TIMES } from "#lib/constants/query-config";
import { omitUndefined } from "#lib/db-insert";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { requireOwnerUserId } from "#lib/require-owner-user-id";
import { sanitizeSearchInput } from "#lib/sanitize-search";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { UnitInput, UnitUpdate } from "#lib/validation/units";
import type { PaginatedResponse } from "#types/api-contracts";
import type { Unit } from "#types/core";
import type { UnitStats } from "#types/stats";
import { mutationKeys } from "../mutation-keys";
import { mapUnitStats } from "./unit-mappers";

/**
 * Unit query filters
 */
export interface UnitFilters {
	property_id?: string;
	status?: "available" | "occupied" | "maintenance" | "reserved";
	search?: string;
	limit?: number;
	offset?: number;
}

const UNIT_SELECT_COLUMNS =
	"id, property_id, owner_user_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, rent_currency, rent_period, status, created_at, updated_at";

/**
 * Unit query factory
 */
export const unitQueries = {
	all: () => ["units"] as const,
	lists: () => [...unitQueries.all(), "list"] as const,

	/**
	 * Unit list with optional filters
	 * Always filters inactive units unless status is explicitly provided
	 */
	list: (filters?: UnitFilters) =>
		queryOptions({
			queryKey: [...unitQueries.lists(), filters ?? {}],
			queryFn: async (): Promise<PaginatedResponse<Unit>> => {
				const supabase = createClient();
				const limit = filters?.limit ?? 50;
				const offset = filters?.offset ?? 0;

				let q = supabase
					.from("units")
					.select(UNIT_SELECT_COLUMNS, { count: "exact" })
					.order("created_at", { ascending: false });

				// Filter inactive by default unless a specific status is requested
				if (filters?.status) {
					q = q.eq("status", filters.status);
				} else {
					q = q.neq("status", "inactive");
				}

				if (filters?.property_id) {
					q = q.eq("property_id", filters.property_id);
				}

				if (filters?.search) {
					const safe = sanitizeSearchInput(filters.search);
					if (safe) {
						q = q.ilike("unit_number", `%${safe}%`);
					}
				}

				q = q.range(offset, offset + limit - 1);

				const { data, error, count } = await q;

				if (error) handlePostgrestError(error, "units");

				return {
					data: (data as Unit[]) ?? [],
					total: count ?? 0,
					pagination: {
						page: Math.floor(offset / limit) + 1,
						limit,
						total: count ?? 0,
						totalPages: Math.ceil((count ?? 0) / limit),
					},
				};
			},
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	/**
	 * Units for a specific property (paginated)
	 * Returns array of units filtered to a property
	 */
	listByProperty: (property_id: string) =>
		queryOptions({
			queryKey: [...unitQueries.lists(), "by-property", property_id],
			queryFn: async (): Promise<Unit[]> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("units")
					.select(UNIT_SELECT_COLUMNS)
					.eq("property_id", property_id)
					.neq("status", "inactive")
					.order("unit_number", { ascending: true });

				if (error) handlePostgrestError(error, "units");

				return (data as Unit[]) ?? [];
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id,
		}),

	details: () => [...unitQueries.all(), "detail"] as const,

	/**
	 * Single unit by ID
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: [...unitQueries.details(), id],
			queryFn: async (): Promise<Unit> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("units")
					.select(UNIT_SELECT_COLUMNS)
					.eq("id", id)
					.single();

				if (error) handlePostgrestError(error, "units");

				return data as Unit;
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!id,
		}),

	/**
	 * All units for a property (non-paginated array)
	 * Optimized for property detail pages showing all units
	 */
	byProperty: (property_id: string) =>
		queryOptions({
			queryKey: [...unitQueries.all(), "by-property", property_id],
			queryFn: async (): Promise<Unit[]> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("units")
					.select(UNIT_SELECT_COLUMNS)
					.eq("property_id", property_id)
					.neq("status", "inactive")
					.order("unit_number", { ascending: true });

				if (error) handlePostgrestError(error, "units");

				return (data as Unit[]) ?? [];
			},
			...QUERY_CACHE_TIMES.DETAIL,
			enabled: !!property_id,
		}),

	/**
	 * Unit statistics
	 * Single owner-scoped `get_unit_stats` RPC through the typed `mapUnitStats`
	 * boundary mapper (PERF-02). Replaces the prior 4 HEAD counts + unbounded
	 * `rent_amount` fetch — the aggregation now runs server-side and the derived
	 * fields are computed in the mapper per the no-regression contract.
	 */
	stats: () =>
		queryOptions({
			queryKey: [...unitQueries.all(), "stats"],
			queryFn: async (): Promise<UnitStats> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const { data, error } = await supabase.rpc("get_unit_stats", {
					p_user_id: user.id,
				});

				if (error) handlePostgrestError(error, "units");

				return mapUnitStats(data);
			},
			...QUERY_CACHE_TIMES.DETAIL,
			gcTime: 30 * 60 * 1000,
		}),
};

export const unitMutations = {
	create: () =>
		mutationOptions({
			mutationKey: mutationKeys.units.create,
			mutationFn: async (data: UnitInput): Promise<Unit> => {
				const supabase = createClient();
				const user = await getCachedUser();
				const ownerId = requireOwnerUserId(user?.id);

				const { data: created, error } = await supabase
					.from("units")
					.insert(omitUndefined({ ...data, owner_user_id: ownerId }))
					.select()
					.single();

				if (error) handlePostgrestError(error, "units");

				return created as Unit;
			},
		}),

	update: () =>
		mutationOptions({
			mutationKey: mutationKeys.units.update,
			mutationFn: async ({
				id,
				data,
				version,
			}: {
				id: string;
				data: UnitUpdate;
				version?: number;
			}): Promise<Unit> => {
				const supabase = createClient();
				const updatePayload = omitUndefined(
					version ? { ...data, version } : { ...data },
				);
				const { data: updated, error } = await supabase
					.from("units")
					.update(updatePayload)
					.eq("id", id)
					.select()
					.single();

				if (error) handlePostgrestError(error, "units");

				return updated as Unit;
			},
		}),

	delete: () =>
		mutationOptions({
			mutationKey: mutationKeys.units.delete,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient();
				const { error } = await supabase
					.from("units")
					.update({ status: "inactive" })
					.eq("id", id);

				if (error) handlePostgrestError(error, "units");
			},
		}),
};
