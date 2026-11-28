/**
 * tenantQueries unit tests
 *
 * Pins the soft-delete invariant that the tenants list and "all tenants"
 * dropdown queries must filter rows whose status = 'inactive' — matching the
 * properties / units / leases pattern documented in CLAUDE.md and closing
 * audit finding F-1 from 2026-05-03.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockSelect, mockNeq, mockOrder, mockOr, mockRange } =
	vi.hoisted(() => ({
		mockFrom: vi.fn(),
		mockSelect: vi.fn(),
		mockNeq: vi.fn(),
		mockOrder: vi.fn(),
		mockOr: vi.fn(),
		mockRange: vi.fn(),
	}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom }),
}));

vi.mock("#lib/postgrest-error-handler", () => ({
	handlePostgrestError: vi.fn(),
}));

import { tenantQueries } from "./tenant-keys";

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("tenantQueries.list", () => {
	beforeEach(() => {
		// Chain (verified from tenant-keys.ts):
		//   from → select → neq → order → [or?] → range  (range is awaited)
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ neq: mockNeq });
		mockNeq.mockReturnValue({ order: mockOrder });
		mockOrder.mockReturnValue({ or: mockOr, range: mockRange });
		mockOr.mockReturnValue({ range: mockRange });
		mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
	});

	it("filters out soft-deleted tenants via .neq('status', 'inactive')", async () => {
		await tenantQueries.list().queryFn?.({} as never);
		expect(mockFrom).toHaveBeenCalledWith("tenants");
		expect(mockNeq).toHaveBeenCalledWith("status", "inactive");
	});

	it("still applies the soft-delete filter when search filters are passed", async () => {
		await tenantQueries
			.list({ search: "jane", limit: 25, offset: 0 })
			.queryFn?.({} as never);
		expect(mockNeq).toHaveBeenCalledWith("status", "inactive");
	});
});

describe("tenantQueries.allTenants", () => {
	beforeEach(() => {
		// Chain (cycle-2 PR #724 — now pages via .range() until PostgREST
		// returns a short page; previously: from → select → neq → order):
		//   from → select → neq → order → range
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ neq: mockNeq });
		mockNeq.mockReturnValue({ order: mockOrder });
		mockOrder.mockReturnValue({ range: mockRange });
		mockRange.mockResolvedValue({ data: [], error: null });
	});

	it("filters out soft-deleted tenants via .neq('status', 'inactive')", async () => {
		await tenantQueries.allTenants().queryFn?.({} as never);
		expect(mockFrom).toHaveBeenCalledWith("tenants");
		expect(mockNeq).toHaveBeenCalledWith("status", "inactive");
	});

	it("pages over .range() until a short page is returned", async () => {
		// Empty response → exactly one .range(0, 999) call, then break.
		await tenantQueries.allTenants().queryFn?.({} as never);
		expect(mockRange).toHaveBeenCalledTimes(1);
		expect(mockRange).toHaveBeenCalledWith(0, 999);
	});
});

describe("tenantQueries.listForLease (the lease wizard's tenant picker)", () => {
	const tenantRow = (n: number) => ({
		id: `tenant-${String(n).padStart(4, "0")}`,
		first_name: "First",
		last_name: `Last ${String(n).padStart(4, "0")}`,
		email: `t${n}@example.com`,
	});

	beforeEach(() => {
		//   from → select → neq → order → range  (range is awaited)
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ neq: mockNeq });
		mockNeq.mockReturnValue({ order: mockOrder });
		mockOrder.mockReturnValue({ range: mockRange });
		mockRange.mockResolvedValue({ data: [], error: null });
	});

	it("sits under lists(), so a tenant created, edited or deleted anywhere refreshes it", () => {
		const lists = tenantQueries.lists();
		const key = tenantQueries.listForLease().queryKey;
		expect(key.slice(0, lists.length)).toEqual([...lists]);
	});

	it("reads past PostgREST's 1000-row cap in id order, and sorts by last name", async () => {
		mockRange
			.mockResolvedValueOnce({
				data: Array.from({ length: 1000 }, (_, i) => tenantRow(1000 - i)),
				error: null,
			})
			.mockResolvedValueOnce({ data: [tenantRow(0)], error: null });

		const tenants = await tenantQueries.listForLease().queryFn?.({} as never);

		expect(mockNeq).toHaveBeenCalledWith("status", "inactive");
		expect(mockOrder).toHaveBeenCalledWith("id", { ascending: true });
		expect(mockRange.mock.calls).toEqual([
			[0, 999],
			[1000, 1999],
		]);
		expect(tenants).toHaveLength(1001);
		expect(tenants?.[0]?.last_name).toBe("Last 0000");
		expect(tenants?.[1000]?.last_name).toBe("Last 1000");
	});
});
