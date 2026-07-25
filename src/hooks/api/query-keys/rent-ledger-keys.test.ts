/**
 * Unit tests for the rent-ledger RPC-boundary mappers and query-key factory
 * (`rent-ledger-keys.ts`) plus the mutation options that write against them
 * (`rent-ledger-mutation-options.ts`) — 55-05.
 *
 * The load-bearing assertion in this suite is the MONEY BOUNDARY (D-00): a
 * `numeric(10,2)` dollar amount crossing the PostgREST/RPC boundary must arrive
 * as the same dollar figure. PostgREST serialises `numeric` as a JSON STRING
 * (to preserve precision), so `"1500.00"` must map to `1500` and never to
 * `150000`. That hundredfold slip is the v8.0 MONEY-01/02 bug class, and the
 * whole point of a typed mapper here.
 *
 * Also pinned: NOT NULL fields throw instead of leaking `undefined`
 * (mapDocumentRow discipline), a credit keeps its negative sign, the reversal
 * path routes to the server-side `reverse_charge` / `reverse_receipt` RPCs
 * rather than composing a client-side negative insert (D-06), and every write
 * sends dollars.
 */

import type { MutationFunction } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeRunningBalance } from "#lib/ledger/ledger-math";

const { mockFrom, mockInsert, mockRpc, mockGetCachedUser } = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockInsert: vi.fn(),
	mockRpc: vi.fn(),
	mockGetCachedUser: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));

vi.mock("#lib/postgrest-error-handler", () => ({
	handlePostgrestError: vi.fn((error: { message: string }) => {
		throw new Error(`PostgREST error: ${error.message}`);
	}),
}));

import {
	mapLedgerEntryRow,
	mapLedgerSummaryRow,
	rentLedgerKeys,
	rentLedgerQueries,
} from "./rent-ledger-keys";
import {
	rentLedgerMutations,
	toSignedLineAmount,
} from "./rent-ledger-mutation-options";

const LEASE_ID = "3f1a9c52-7d4e-4b8a-9c21-5e6f7a8b9c01";
const CHARGE_ID = "5b2c8d41-9e3f-4a7b-8d12-6f7a8b9c0d12";
const RECEIPT_ID = "7c3d9e52-0f4a-4b8c-9e23-7a8b9c0d1e23";
const OWNER_ID = "9d4e0f63-1a5b-4c9d-8f34-8b9c0d1e2f34";

const queryClient = new QueryClient();

interface MockQueryContext {
	meta: undefined;
	queryKey: readonly unknown[];
	signal: AbortSignal;
	client: QueryClient;
	pageParam: undefined;
	direction: undefined;
}

/** Invoke a queryOptions queryFn with a stand-in TanStack context. */
function callQueryFn<T>(opts: {
	queryFn?: ((ctx: never) => T | Promise<T>) | undefined;
	queryKey: readonly unknown[];
}): T | Promise<T> {
	if (!opts.queryFn) throw new Error("queryFn is undefined");
	const ctx: MockQueryContext = {
		meta: undefined,
		queryKey: opts.queryKey,
		signal: new AbortController().signal,
		client: queryClient,
		pageParam: undefined,
		direction: undefined,
	};
	return (opts.queryFn as (c: MockQueryContext) => T | Promise<T>)(ctx);
}

const chargeRow = {
	id: CHARGE_ID,
	kind: "charge",
	type: "rent",
	amount: "1500.00",
	entry_date: "2026-07-01",
	due_date: "2026-07-01",
	description: "Rent for July 2026",
	method: null,
	reverses_id: null,
	charge_id: null,
	receipts_sum: "500.00",
};

const receiptRow = {
	id: RECEIPT_ID,
	kind: "receipt",
	type: null,
	amount: "500.00",
	entry_date: "2026-07-03",
	due_date: null,
	description: null,
	method: "check",
	reverses_id: null,
	charge_id: CHARGE_ID,
	receipts_sum: null,
};

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCachedUser.mockResolvedValue({ id: OWNER_ID });
	mockFrom.mockReturnValue({ insert: mockInsert });
	mockInsert.mockResolvedValue({ error: null });
	mockRpc.mockResolvedValue({ data: null, error: null });
});

describe("mapLedgerSummaryRow", () => {
	it("maps PostgREST numeric strings to DOLLARS, never hundredfold", () => {
		const summary = mapLedgerSummaryRow({
			charges_total: "3000.00",
			credits_total: "-125.50",
			receipts_total: "1500.00",
			balance: "1500.00",
			late_count: 2,
			late_amount: "1500.00",
		});

		expect(summary.balance).toBe(1500);
		expect(summary.balance).not.toBe(150000);
		expect(summary.chargesTotal).toBe(3000);
		expect(summary.creditsTotal).toBe(-125.5);
		expect(summary.receiptsTotal).toBe(1500);
		expect(summary.lateCount).toBe(2);
		expect(summary.lateAmount).toBe(1500);
	});

	it("passes a JSON number through unchanged", () => {
		expect(mapLedgerSummaryRow({ balance: 1500 }).balance).toBe(1500);
	});

	it("defaults absent aggregates to 0 (a lease with no ledger rows)", () => {
		expect(mapLedgerSummaryRow({})).toEqual({
			chargesTotal: 0,
			creditsTotal: 0,
			receiptsTotal: 0,
			balance: 0,
			lateCount: 0,
			lateAmount: 0,
		});
	});

	it("throws on a non-numeric aggregate rather than yielding NaN", () => {
		expect(() => mapLedgerSummaryRow({ balance: "not-a-number" })).toThrow(
			/'balance'/,
		);
	});
});

describe("mapLedgerEntryRow", () => {
	it("maps a rent charge with dollar amounts", () => {
		const entry = mapLedgerEntryRow(chargeRow);

		expect(entry).toEqual({
			id: CHARGE_ID,
			kind: "charge",
			type: "rent",
			amount: 1500,
			entryDate: "2026-07-01",
			dueDate: "2026-07-01",
			description: "Rent for July 2026",
			method: null,
			reversesId: null,
			chargeId: null,
			receiptsSum: 500,
		});
	});

	it("maps a receipt, labelling its type from the entry kind", () => {
		const entry = mapLedgerEntryRow(receiptRow);

		expect(entry.kind).toBe("receipt");
		expect(entry.type).toBe("receipt");
		expect(entry.amount).toBe(500);
		expect(entry.method).toBe("check");
		expect(entry.chargeId).toBe(CHARGE_ID);
		expect(entry.dueDate).toBeNull();
		expect(entry.receiptsSum).toBe(0);
	});

	it("preserves a credit's negative sign", () => {
		const entry = mapLedgerEntryRow({
			...chargeRow,
			type: "credit",
			amount: "-250.50",
			receipts_sum: null,
		});

		expect(entry.amount).toBe(-250.5);
	});

	it("throws when the NOT NULL id is missing", () => {
		const { id: _id, ...withoutId } = chargeRow;
		expect(() => mapLedgerEntryRow(withoutId)).toThrow(/'id'/);
	});

	it("throws when kind is not charge or receipt", () => {
		expect(() => mapLedgerEntryRow({ ...chargeRow, kind: "transfer" })).toThrow(
			/'kind'/,
		);
	});

	it("throws when the NOT NULL amount is absent", () => {
		const { amount: _amount, ...withoutAmount } = chargeRow;
		expect(() => mapLedgerEntryRow(withoutAmount)).toThrow(/'amount'/);
	});

	it("feeds ledger-math with a running balance in dollars", () => {
		const withBalance = computeRunningBalance([
			mapLedgerEntryRow(chargeRow),
			mapLedgerEntryRow(receiptRow),
		]);

		expect(withBalance[0]?.runningBalance).toBe(1500);
		expect(withBalance[1]?.runningBalance).toBe(1000);
	});
});

describe("rentLedgerKeys", () => {
	it("nests every leaf under the per-lease branch", () => {
		expect(rentLedgerKeys.all).toEqual(["rent-ledger"]);
		expect(rentLedgerKeys.forLease(LEASE_ID)).toEqual([
			"rent-ledger",
			LEASE_ID,
		]);
		expect(rentLedgerKeys.summary(LEASE_ID)).toEqual([
			"rent-ledger",
			LEASE_ID,
			"summary",
		]);
		expect(rentLedgerKeys.entries(LEASE_ID)).toEqual([
			"rent-ledger",
			LEASE_ID,
			"entries",
		]);
	});
});

describe("rentLedgerQueries", () => {
	it("summary calls get_lease_ledger_summary and maps dollars", async () => {
		mockRpc.mockResolvedValue({
			data: [{ balance: "1500.00", late_count: 1 }],
			error: null,
		});

		const result = await callQueryFn(rentLedgerQueries.summary(LEASE_ID));

		expect(mockRpc).toHaveBeenCalledWith("get_lease_ledger_summary", {
			p_lease_id: LEASE_ID,
		});
		expect(result.balance).toBe(1500);
		expect(result.lateCount).toBe(1);
	});

	it("summary returns zeroed totals when the RPC yields no row", async () => {
		mockRpc.mockResolvedValue({ data: [], error: null });

		const result = await callQueryFn(rentLedgerQueries.summary(LEASE_ID));

		expect(result.balance).toBe(0);
	});

	it("summary surfaces an RPC error through handlePostgrestError", async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: "denied" } });

		await expect(
			callQueryFn(rentLedgerQueries.summary(LEASE_ID)),
		).rejects.toMatchObject({
			message: expect.stringContaining("denied"),
		});
	});

	it("entries calls get_lease_ledger and maps the ordered stream", async () => {
		mockRpc.mockResolvedValue({ data: [chargeRow, receiptRow], error: null });

		const result = await callQueryFn(rentLedgerQueries.entries(LEASE_ID));

		expect(mockRpc).toHaveBeenCalledWith("get_lease_ledger", {
			p_lease_id: LEASE_ID,
		});
		expect(result).toHaveLength(2);
		expect(result[0]?.amount).toBe(1500);
		expect(result[1]?.amount).toBe(500);
	});

	it("stays disabled for a non-UUID lease id", () => {
		expect(rentLedgerQueries.summary("undefined").enabled).toBe(false);
		expect(rentLedgerQueries.entries("undefined").enabled).toBe(false);
		expect(rentLedgerQueries.summary(LEASE_ID).enabled).toBe(true);
	});
});

describe("toSignedLineAmount", () => {
	it("stores a credit as a negative amount", () => {
		expect(toSignedLineAmount("credit", 250.5)).toBe(-250.5);
	});

	it("stores charges as positive amounts", () => {
		expect(toSignedLineAmount("late_fee", 75)).toBe(75);
		expect(toSignedLineAmount("manual_charge", 120.25)).toBe(120.25);
	});
});

describe("rentLedgerMutations", () => {
	async function run<TInput>(
		options: { mutationFn?: MutationFunction<void, TInput> | undefined },
		input: TInput,
	): Promise<void> {
		if (!options.mutationFn) throw new Error("mutationFn is undefined");
		await options.mutationFn(input, { client: queryClient, meta: undefined });
	}

	it("recordReceipt inserts dollars against the selected charge", async () => {
		await run(rentLedgerMutations.recordReceipt(), {
			chargeId: CHARGE_ID,
			leaseId: LEASE_ID,
			amount: 1500,
			method: "check",
			receivedDate: "2026-07-03",
		});

		expect(mockFrom).toHaveBeenCalledWith("rent_receipts");
		expect(mockInsert).toHaveBeenCalledWith({
			charge_id: CHARGE_ID,
			lease_id: LEASE_ID,
			owner_user_id: OWNER_ID,
			amount: 1500,
			method: "check",
			received_date: "2026-07-03",
		});
	});

	it("recordReceipt rejects a non-positive amount before touching the DB", async () => {
		await expect(
			run(rentLedgerMutations.recordReceipt(), {
				chargeId: CHARGE_ID,
				leaseId: LEASE_ID,
				amount: 0,
				method: "check",
				receivedDate: "2026-07-03",
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining("greater than $0"),
		});
		expect(mockInsert).not.toHaveBeenCalled();
	});

	it("recordReceipt rejects an empty method label", async () => {
		await expect(
			run(rentLedgerMutations.recordReceipt(), {
				chargeId: CHARGE_ID,
				leaseId: LEASE_ID,
				amount: 100,
				method: "   ",
				receivedDate: "2026-07-03",
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining("label"),
		});
		expect(mockInsert).not.toHaveBeenCalled();
	});

	it("addLine stores a credit as a negative charge row", async () => {
		await run(rentLedgerMutations.addLine(), {
			leaseId: LEASE_ID,
			type: "credit",
			amount: 250.5,
			date: "2026-07-10",
			description: "Goodwill credit",
		});

		expect(mockFrom).toHaveBeenCalledWith("rent_charges");
		expect(mockInsert).toHaveBeenCalledWith({
			lease_id: LEASE_ID,
			owner_user_id: OWNER_ID,
			type: "credit",
			amount: -250.5,
			period_start: "2026-07-10",
			due_date: "2026-07-10",
			description: "Goodwill credit",
		});
	});

	it("addLine stores a late fee as a positive charge row", async () => {
		await run(rentLedgerMutations.addLine(), {
			leaseId: LEASE_ID,
			type: "late_fee",
			amount: 75,
			date: "2026-07-10",
			description: "Late fee",
		});

		expect(mockInsert).toHaveBeenCalledWith(
			expect.objectContaining({ type: "late_fee", amount: 75 }),
		);
	});

	it("startTracking calls start_lease_ledger with the opening balance in dollars", async () => {
		await run(rentLedgerMutations.startTracking(), {
			leaseId: LEASE_ID,
			startDate: "2026-07-01",
			openingBalance: 1500,
		});

		expect(mockRpc).toHaveBeenCalledWith("start_lease_ledger", {
			p_lease_id: LEASE_ID,
			p_start_date: "2026-07-01",
			p_opening_balance: 1500,
		});
	});

	it("startTracking accepts a zero opening balance", async () => {
		await run(rentLedgerMutations.startTracking(), {
			leaseId: LEASE_ID,
			startDate: "2026-07-01",
			openingBalance: 0,
		});

		expect(mockRpc).toHaveBeenCalledWith(
			"start_lease_ledger",
			expect.objectContaining({ p_opening_balance: 0 }),
		);
	});

	it("reverseEntry routes a charge to the reverse_charge RPC", async () => {
		await run(rentLedgerMutations.reverseEntry(), {
			leaseId: LEASE_ID,
			entryKind: "charge",
			entryId: CHARGE_ID,
		});

		expect(mockRpc).toHaveBeenCalledWith("reverse_charge", {
			p_charge_id: CHARGE_ID,
		});
		expect(mockInsert).not.toHaveBeenCalled();
	});

	it("reverseEntry routes a receipt to the reverse_receipt RPC", async () => {
		await run(rentLedgerMutations.reverseEntry(), {
			leaseId: LEASE_ID,
			entryKind: "receipt",
			entryId: RECEIPT_ID,
		});

		expect(mockRpc).toHaveBeenCalledWith("reverse_receipt", {
			p_receipt_id: RECEIPT_ID,
		});
		expect(mockInsert).not.toHaveBeenCalled();
	});

	it("surfaces an insert failure through handlePostgrestError", async () => {
		mockInsert.mockResolvedValue({ error: { message: "row-level security" } });

		await expect(
			run(rentLedgerMutations.recordReceipt(), {
				chargeId: CHARGE_ID,
				leaseId: LEASE_ID,
				amount: 100,
				method: "cash",
				receivedDate: "2026-07-03",
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining("row-level security"),
		});
	});

	it("surfaces a reversal RPC failure through handlePostgrestError", async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: "denied" } });

		await expect(
			run(rentLedgerMutations.reverseEntry(), {
				leaseId: LEASE_ID,
				entryKind: "charge",
				entryId: CHARGE_ID,
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining("denied"),
		});
	});
});
