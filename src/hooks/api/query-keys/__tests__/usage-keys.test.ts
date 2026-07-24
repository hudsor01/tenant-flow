/**
 * usageQueries data-layer unit tests (METER-02 / METER-03).
 *
 * Pins the typed boundary mappers for the two owner-scoped usage RPCs
 * (get_esign_usage_current_month / get_storage_usage_summary) — CLAUDE.md
 * rule #8 (no `as unknown as`, no `any`):
 *   - the e-sign mapper produces { used, cap, unlimited } incl. the Max
 *     (unlimited) branch;
 *   - the storage mapper produces { usedBytes, limitGb, unlimited } and
 *     treats limit_gb -1 as unlimited; bigint used_bytes arriving as a string
 *     over PostgREST coerces safely via Number();
 *   - both factories are queryOptions() with staleTime 60s and a stable
 *     factory-derived queryKey (no string-literal array in a consumer).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc, mockGetCachedUser } = vi.hoisted(() => ({
	mockRpc: vi.fn(),
	mockGetCachedUser: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ rpc: mockRpc }),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));

import { usageKeys, usageQueries } from "../usage-keys";

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCachedUser.mockResolvedValue({ id: "owner-1" });
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("usageKeys", () => {
	it("derives stable esign/storage keys from the usage root", () => {
		expect(usageKeys.all).toEqual(["usage"]);
		expect(usageKeys.esign()).toEqual(["usage", "esign", "current-month"]);
		expect(usageKeys.storage()).toEqual(["usage", "storage"]);
	});
});

describe("usageQueries.esign", () => {
	it("is a queryOptions() factory with a 60s staleTime and factory key", () => {
		const opts = usageQueries.esign();
		expect(opts.staleTime).toBe(60_000);
		expect(opts.queryKey).toEqual(["usage", "esign", "current-month"]);
	});

	it("maps a Growth row to { used, cap, unlimited:false }", async () => {
		mockRpc.mockResolvedValue({
			data: [{ used: 12, cap: 25, unlimited: false }],
			error: null,
		});
		const result = await usageQueries.esign().queryFn?.({} as never);
		expect(mockRpc).toHaveBeenCalledWith("get_esign_usage_current_month");
		expect(result).toEqual({ used: 12, cap: 25, unlimited: false });
	});

	it("maps a Max row to unlimited:true", async () => {
		mockRpc.mockResolvedValue({
			data: [{ used: 0, cap: 25, unlimited: true }],
			error: null,
		});
		const result = await usageQueries.esign().queryFn?.({} as never);
		expect(result?.unlimited).toBe(true);
	});

	it("coerces a missing row to a safe zero shape", async () => {
		mockRpc.mockResolvedValue({ data: [], error: null });
		const result = await usageQueries.esign().queryFn?.({} as never);
		expect(result).toEqual({ used: 0, cap: 25, unlimited: false });
	});

	it("throws when the RPC errors", async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: "rpc boom" } });
		await expect(
			usageQueries.esign().queryFn?.({} as never),
		).rejects.toMatchObject({ message: expect.stringContaining("rpc boom") });
	});
});

describe("usageQueries.storage", () => {
	it("is a queryOptions() factory with a 60s staleTime and factory key", () => {
		const opts = usageQueries.storage();
		expect(opts.staleTime).toBe(60_000);
		expect(opts.queryKey).toEqual(["usage", "storage"]);
	});

	it("maps a Growth row (10 GB quota) to bytes + limitGb, unlimited:false", async () => {
		mockRpc.mockResolvedValue({
			data: [{ used_bytes: 5_368_709_120, limit_gb: 10 }],
			error: null,
		});
		const result = await usageQueries.storage().queryFn?.({} as never);
		expect(mockRpc).toHaveBeenCalledWith("get_storage_usage_summary");
		expect(result).toEqual({
			usedBytes: 5_368_709_120,
			limitGb: 10,
			unlimited: false,
		});
	});

	it("treats limit_gb -1 as unlimited (Max)", async () => {
		mockRpc.mockResolvedValue({
			data: [{ used_bytes: 999, limit_gb: -1 }],
			error: null,
		});
		const result = await usageQueries.storage().queryFn?.({} as never);
		expect(result?.unlimited).toBe(true);
	});

	it("coerces a bigint used_bytes arriving as a string over PostgREST", async () => {
		mockRpc.mockResolvedValue({
			data: [{ used_bytes: "5368709120", limit_gb: "10" }],
			error: null,
		});
		const result = await usageQueries.storage().queryFn?.({} as never);
		expect(result?.usedBytes).toBe(5_368_709_120);
		expect(result?.limitGb).toBe(10);
	});

	it("throws when the RPC errors", async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: "rpc boom" } });
		await expect(
			usageQueries.storage().queryFn?.({} as never),
		).rejects.toMatchObject({ message: expect.stringContaining("rpc boom") });
	});
});
