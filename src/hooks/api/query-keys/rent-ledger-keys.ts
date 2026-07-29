/**
 * Rent-ledger query keys and typed RPC-boundary mappers (LEDGER-02/03/05).
 * The write half lives in `rent-ledger-mutation-options.ts` (split to keep both
 * files under the 300-line cap) — import it directly, there is no re-export here
 * per the project's no-barrel-files rule.
 *
 * MONEY BOUNDARY (D-00, load-bearing): every amount is `numeric(10,2)` DOLLARS,
 * from `rent_charges` / `rent_receipts` straight through to the caller. There is
 * no cents representation anywhere in this subsystem, so the mappers coerce with
 * `Number()` and nothing else — no scaling, ever. PostgREST serialises `numeric`
 * as a JSON string to preserve precision, which is exactly where a naive reader
 * could reintroduce the v8.0 MONEY-01/02 hundredfold bug; the mapper unit tests
 * pin `"1500.00" -> 1500` and `rent-ledger-money.test.ts` (55-03) statically
 * scans this file for scaling tokens.
 *
 * Analog: `document-keys.ts` (queryOptions factory + `mapDocumentRow` boundary
 * discipline — typed mapper, never `as unknown as`).
 */

import { queryOptions } from "@tanstack/react-query";
import { QUERY_CACHE_TIMES } from "#lib/constants/query-config";
import type { LedgerEntry } from "#lib/ledger/ledger-math";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonArray, jsonObject } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { uuidSchema } from "#lib/validation/common";

/** Derived balance-strip figures for one lease, in dollars. */
export interface LedgerSummary {
	chargesTotal: number;
	creditsTotal: number;
	receiptsTotal: number;
	balance: number;
	lateCount: number;
	lateAmount: number;
}

/**
 * One row of the chronological entry stream. Extends the `LedgerEntry` contract
 * that `ledger-math.ts` (55-03) derives running balance and paid/partial/unpaid
 * state from — extended, not redefined, so the two can never drift — plus the
 * two display-only columns the ledger table renders.
 */
export interface LedgerEntryRow extends LedgerEntry {
	description: string | null;
	method: string | null;
}

/**
 * Read a dollar amount from an RPC row. `fallback: null` marks a NOT NULL field
 * and throws when absent rather than letting a dropped column read as 0 money.
 */
function toDollars(
	raw: Record<string, unknown>,
	field: string,
	fallback: number | null,
): number {
	const value = raw[field];
	if (value === null || value === undefined) {
		if (fallback === null) {
			throw new Error(
				`rent-ledger mapper: NOT NULL field '${field}' missing from the RPC response`,
			);
		}
		return fallback;
	}
	const amount = typeof value === "string" ? Number(value) : value;
	if (typeof amount !== "number" || !Number.isFinite(amount)) {
		throw new Error(
			`rent-ledger mapper: field '${field}' is not a finite dollar amount`,
		);
	}
	return amount;
}

function requireString(raw: Record<string, unknown>, field: string): string {
	const value = raw[field];
	if (typeof value !== "string") {
		throw new Error(
			`mapLedgerEntryRow: NOT NULL field '${field}' missing or non-string from the RPC response`,
		);
	}
	return value;
}

function optionalString(
	raw: Record<string, unknown>,
	field: string,
): string | null {
	const value = raw[field];
	return typeof value === "string" ? value : null;
}

/** Map one `get_lease_ledger_summary` row into dollars. */
export function mapLedgerSummaryRow(
	raw: Record<string, unknown>,
): LedgerSummary {
	return {
		chargesTotal: toDollars(raw, "charges_total", 0),
		creditsTotal: toDollars(raw, "credits_total", 0),
		receiptsTotal: toDollars(raw, "receipts_total", 0),
		balance: toDollars(raw, "balance", 0),
		lateCount: toDollars(raw, "late_count", 0),
		lateAmount: toDollars(raw, "late_amount", 0),
	};
}

/**
 * Map one `get_lease_ledger` entry. Receipt rows carry a null `type` (only
 * charges have one), so the entry kind labels them — `ledger-math`'s contract
 * types `type` as a non-null discriminator for the table's Type column.
 */
export function mapLedgerEntryRow(
	raw: Record<string, unknown>,
): LedgerEntryRow {
	const kind = raw.kind;
	if (kind !== "charge" && kind !== "receipt") {
		throw new Error(
			"mapLedgerEntryRow: field 'kind' must be 'charge' or 'receipt'",
		);
	}
	return {
		id: requireString(raw, "id"),
		kind,
		type: typeof raw.type === "string" ? raw.type : kind,
		amount: toDollars(raw, "amount", null),
		entryDate: requireString(raw, "entry_date"),
		dueDate: optionalString(raw, "due_date"),
		description: optionalString(raw, "description"),
		method: optionalString(raw, "method"),
		reversesId: optionalString(raw, "reverses_id"),
		chargeId: optionalString(raw, "charge_id"),
		receiptsSum: toDollars(raw, "receipts_sum", 0),
	};
}

export const rentLedgerKeys = {
	all: ["rent-ledger"] as const,
	/** Invalidation target for every ledger mutation on this lease. */
	forLease: (leaseId: string) => [...rentLedgerKeys.all, leaseId] as const,
	summary: (leaseId: string) =>
		[...rentLedgerKeys.forLease(leaseId), "summary"] as const,
	entries: (leaseId: string) =>
		[...rentLedgerKeys.forLease(leaseId), "entries"] as const,
};

/** A lease with no ledger rows: honest zeros, never a fabricated figure. */
const EMPTY_LEDGER_SUMMARY: LedgerSummary = {
	chargesTotal: 0,
	creditsTotal: 0,
	receiptsTotal: 0,
	balance: 0,
	lateCount: 0,
	lateAmount: 0,
};

/** Guard a bogus route param from firing an RPC that fails on UUID format. */
function isLeaseId(leaseId: string): boolean {
	return uuidSchema.safeParse(leaseId).success;
}

export const rentLedgerQueries = {
	summary: (leaseId: string) =>
		queryOptions({
			queryKey: rentLedgerKeys.summary(leaseId),
			queryFn: async (): Promise<LedgerSummary> => {
				const supabase = createClient();
				const { data, error } = await supabase.rpc("get_lease_ledger_summary", {
					p_lease_id: leaseId,
				});
				if (error) handlePostgrestError(error, "rent ledger summary");
				const row = data?.[0];
				return row
					? mapLedgerSummaryRow(jsonObject<Record<string, unknown>>(row))
					: { ...EMPTY_LEDGER_SUMMARY };
			},
			enabled: isLeaseId(leaseId),
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	entries: (leaseId: string) =>
		queryOptions({
			queryKey: rentLedgerKeys.entries(leaseId),
			queryFn: async (): Promise<LedgerEntryRow[]> => {
				const supabase = createClient();
				const { data, error } = await supabase.rpc("get_lease_ledger", {
					p_lease_id: leaseId,
				});
				if (error) handlePostgrestError(error, "rent ledger");
				// The RPC already returns the stream ordered by entry date; the
				// running balance is derived client-side by ledger-math (W3).
				return jsonArray<unknown>(data).map((entry) =>
					mapLedgerEntryRow(jsonObject<Record<string, unknown>>(entry)),
				);
			},
			enabled: isLeaseId(leaseId),
			...QUERY_CACHE_TIMES.DETAIL,
		}),
};
