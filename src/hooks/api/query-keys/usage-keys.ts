/**
 * Owner-scoped usage query factory (METER-02 / METER-03).
 *
 * Reads the two param-less, owner-guarded usage RPCs that resolve
 * `(select auth.uid())` server-side (no owner id crosses the wire):
 *   - get_esign_usage_current_month() -> { used, cap, unlimited }
 *   - get_storage_usage_summary()     -> { used_bytes, limit_gb }  (limit_gb -1 = unlimited)
 *
 * queryOptions() factories per CLAUDE.md rule #9 (no string-literal query keys
 * in consumers) with a typed boundary mapper per rule #8 (no `as unknown as`,
 * no `any`). `used_bytes` is a bigint that arrives as a string over PostgREST,
 * so both numeric fields coerce defensively via `Number(...)`.
 */

import { queryOptions } from "@tanstack/react-query";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";

export interface EsignUsage {
	used: number;
	cap: number;
	unlimited: boolean;
}

export interface StorageUsage {
	usedBytes: number;
	limitGb: number;
	unlimited: boolean;
}

// Metered (Growth) e-sign cap. Max is unlimited (`unlimited: true`), and the
// RPC also returns the authoritative cap — the fallback only guards a missing
// row so a transient empty response degrades to the known plan cap, not 0.
const ESIGN_CAP_FALLBACK = 25;

interface EsignUsageRow {
	used?: number | null;
	cap?: number | null;
	unlimited?: boolean | null;
}

interface StorageUsageRow {
	used_bytes?: number | string | null;
	limit_gb?: number | string | null;
}

function mapEsignUsageRow(row: EsignUsageRow | undefined): EsignUsage {
	return {
		used: Number(row?.used ?? 0),
		cap: Number(row?.cap ?? ESIGN_CAP_FALLBACK),
		unlimited: Boolean(row?.unlimited),
	};
}

function mapStorageUsageRow(row: StorageUsageRow | undefined): StorageUsage {
	const limitGb = Number(row?.limit_gb ?? 0);
	return {
		usedBytes: Number(row?.used_bytes ?? 0),
		limitGb,
		unlimited: limitGb < 0,
	};
}

export const usageKeys = {
	all: ["usage"] as const,
	esign: () => [...usageKeys.all, "esign", "current-month"] as const,
	storage: () => [...usageKeys.all, "storage"] as const,
};

export const usageQueries = {
	esign: () =>
		queryOptions({
			queryKey: usageKeys.esign(),
			queryFn: async (): Promise<EsignUsage> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				const { data, error } = await supabase.rpc(
					"get_esign_usage_current_month",
				);
				if (error) throw error;
				const row = Array.isArray(data) ? data[0] : data;
				return mapEsignUsageRow(row ?? undefined);
			},
			staleTime: 60_000,
		}),

	storage: () =>
		queryOptions({
			queryKey: usageKeys.storage(),
			queryFn: async (): Promise<StorageUsage> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");
				const { data, error } = await supabase.rpc("get_storage_usage_summary");
				if (error) throw error;
				const row = Array.isArray(data) ? data[0] : data;
				return mapStorageUsageRow(row ?? undefined);
			},
			staleTime: 60_000,
		}),
};
