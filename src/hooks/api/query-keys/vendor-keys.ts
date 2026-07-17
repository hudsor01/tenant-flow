import { queryOptions } from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { normalizeSearchInput } from "#lib/sanitize-search";
import { createClient } from "#lib/supabase/client";
import type { Vendor, VendorFilters } from "#types/domain";

interface VendorListResponse {
	data: Vendor[];
	total: number;
	limit: number;
	offset: number;
}

const VENDOR_SELECT_COLUMNS =
	"id, owner_user_id, name, email, phone, trade, hourly_rate, status, notes, created_at, updated_at";

export const vendorQueries = {
	all: ["vendors"] as const,
	lists: () => [...vendorQueries.all, "list"] as const,
	list: (filters?: VendorFilters) =>
		queryOptions({
			queryKey: [...vendorQueries.lists(), filters ?? {}],
			queryFn: async (): Promise<VendorListResponse> => {
				const supabase = createClient();
				const limit = filters?.limit ?? 50;
				const offset = filters?.offset ?? 0;

				let q = supabase
					.from("vendors")
					.select(VENDOR_SELECT_COLUMNS, { count: "exact" })
					.eq("status", filters?.status ?? "active")
					.order("name", { ascending: true });

				if (filters?.trade) {
					q = q.eq("trade", filters.trade);
				}
				if (filters?.search) {
					const safe = normalizeSearchInput(filters.search);
					if (safe) {
						q = q.ilike("name", `%${safe}%`);
					}
				}

				q = q.range(offset, offset + limit - 1);

				const { data, error, count } = await q;

				if (error) handlePostgrestError(error, "vendors");

				return {
					data: (data as Vendor[]) ?? [],
					total: count ?? 0,
					limit,
					offset,
				};
			},
			staleTime: 5 * 60 * 1000,
		}),
	details: () => [...vendorQueries.all, "detail"] as const,
	detail: (id: string) =>
		queryOptions({
			queryKey: [...vendorQueries.details(), id],
			queryFn: async (): Promise<Vendor> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("vendors")
					.select(VENDOR_SELECT_COLUMNS)
					.eq("id", id)
					.single();

				if (error) handlePostgrestError(error, "vendors");

				return data as Vendor;
			},
			staleTime: 5 * 60 * 1000,
			enabled: !!id,
		}),
};
