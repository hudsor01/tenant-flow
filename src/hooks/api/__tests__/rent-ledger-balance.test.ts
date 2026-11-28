/**
 * Unit tests for the pure ledger-derivation math (LEDGER-02/03/05).
 *
 * `src/lib/ledger/ledger-math.ts` computes the ledger table's per-row running
 * balance and per-charge paid/partial/unpaid/late badges without
 * round-tripping the DB per row (W3). Whether a charge is late is the
 * DATABASE's call: `get_lease_ledger` returns each charge's `late_after`
 * (`due_date + the lease's grace_period_days`), and `get_lease_ledger_summary`
 * counts late charges with the same expression; this module only compares
 * `late_after` with today, so the late-after day is NOT late and the next day
 * IS.
 *
 * Money: every amount is DOLLARS. No cents, no hundredfold scaling anywhere
 * (D-00 — the v8.0 100x bug class this phase must not reintroduce).
 */

import { describe, expect, it } from "vitest";
import {
	computeRunningBalance,
	deriveChargeState,
	isLate,
	type LedgerEntry,
} from "#lib/ledger/ledger-math";

const MS_PER_DAY = 86_400_000;

/** A fixed "today" so the grace-boundary cases are deterministic. */
const TODAY = new Date(Date.UTC(2026, 6, 24)); // 2026-07-24

/** The YYYY-MM-DD date exactly `days` days before TODAY (UTC calendar). */
function daysBeforeToday(days: number): string {
	return new Date(TODAY.getTime() - days * MS_PER_DAY)
		.toISOString()
		.slice(0, 10);
}

/** The YYYY-MM-DD date exactly `days` days after TODAY (UTC calendar). */
function daysAfterToday(days: number): string {
	return daysBeforeToday(-days);
}

const baseCharge: LedgerEntry = {
	id: "charge-1",
	kind: "charge",
	type: "rent",
	amount: 1500,
	entryDate: "2026-05-01",
	dueDate: "2026-05-01",
	lateAfter: "2026-05-06",
	reversesId: null,
	chargeId: null,
	receiptsSum: 0,
};

function charge(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
	return { ...baseCharge, ...overrides };
}

function receipt(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
	return {
		...baseCharge,
		kind: "receipt",
		type: "receipt",
		id: "receipt-1",
		dueDate: null,
		lateAfter: null,
		chargeId: baseCharge.id,
		receiptsSum: 0,
		...overrides,
	};
}

describe("isLate", () => {
	it("is false when nothing remains unpaid, however old the charge is", () => {
		expect(isLate(0, daysBeforeToday(400), TODAY)).toBe(false);
	});

	it("is false when the charge has no late-after date", () => {
		expect(isLate(1500, null, TODAY)).toBe(false);
	});

	it("is false while the grace window is still open", () => {
		expect(isLate(1500, daysAfterToday(3), TODAY)).toBe(false);
	});

	it("is NOT late on the late-after day itself (the grace window's last day)", () => {
		expect(isLate(1500, daysBeforeToday(0), TODAY)).toBe(false);
	});

	it("IS late the day after the late-after date", () => {
		expect(isLate(1500, daysBeforeToday(1), TODAY)).toBe(true);
	});

	it("is false when only float dust remains (numeric(10,2) tolerance)", () => {
		// 1500 - 1499.99 - 0.01 leaves sub-cent float dust, not a real balance.
		const remaining = 1500 - 1499.99 - 0.01;
		expect(isLate(remaining, daysBeforeToday(30), TODAY)).toBe(false);
	});
});

describe("deriveChargeState", () => {
	it("is paid when receipts cover the charge exactly", () => {
		expect(deriveChargeState(1500, 1500, daysBeforeToday(30), TODAY)).toBe(
			"paid",
		);
	});

	it("is paid when receipts exceed the charge (overpayment lands as credit)", () => {
		expect(deriveChargeState(1500, 1600, daysBeforeToday(30), TODAY)).toBe(
			"paid",
		);
	});

	it("is partial when some receipts landed and the grace window is open", () => {
		expect(deriveChargeState(1500, 600, daysAfterToday(2), TODAY)).toBe(
			"partial",
		);
	});

	it("transitions partial -> paid as further receipts land against the charge", () => {
		const lateAfter = daysAfterToday(2);
		expect(deriveChargeState(1500, 600, lateAfter, TODAY)).toBe("partial");
		expect(deriveChargeState(1500, 900 + 600, lateAfter, TODAY)).toBe("paid");
	});

	it("is unpaid when nothing was received and the grace window is open", () => {
		expect(deriveChargeState(1500, 0, daysAfterToday(2), TODAY)).toBe("unpaid");
	});

	it("is unpaid (never late) when the charge has no late-after date", () => {
		expect(deriveChargeState(1500, 0, null, TODAY)).toBe("unpaid");
	});

	it("is unpaid on the late-after day itself", () => {
		expect(deriveChargeState(1500, 0, daysBeforeToday(0), TODAY)).toBe(
			"unpaid",
		);
	});

	it("is late the day after, with nothing received", () => {
		expect(deriveChargeState(1500, 0, daysBeforeToday(1), TODAY)).toBe("late");
	});

	it("is late (not partial) when a remaining balance survives the grace window", () => {
		expect(deriveChargeState(1500, 600, daysBeforeToday(1), TODAY)).toBe(
			"late",
		);
	});

	it("is paid (not late) once covered, even long past the grace window", () => {
		expect(deriveChargeState(1500, 1500, daysBeforeToday(90), TODAY)).toBe(
			"paid",
		);
	});
});

describe("computeRunningBalance", () => {
	it("adds charges and subtracts receipts in entry order, in dollars", () => {
		const rows = computeRunningBalance([
			charge({ id: "c1", amount: 1500, entryDate: "2026-05-01" }),
			receipt({ id: "r1", amount: 1000, entryDate: "2026-05-03" }),
			receipt({ id: "r2", amount: 500, entryDate: "2026-05-10" }),
			charge({
				id: "c2",
				type: "late_fee",
				amount: 75,
				entryDate: "2026-06-05",
				dueDate: "2026-06-05",
			}),
		]);

		expect(rows.map((row) => row.runningBalance)).toEqual([1500, 500, 0, 75]);
		// The entries themselves are passed through untouched.
		expect(rows[0]?.id).toBe("c1");
		expect(rows[3]?.amount).toBe(75);
	});

	it("lets a credit line (negative charge) reduce the running balance", () => {
		const rows = computeRunningBalance([
			charge({ id: "c1", amount: 1500 }),
			charge({
				id: "c2",
				type: "credit",
				amount: -250,
				entryDate: "2026-05-04",
				dueDate: null,
			}),
		]);

		expect(rows.map((row) => row.runningBalance)).toEqual([1500, 1250]);
	});

	it("nets a reversed charge back to zero", () => {
		const rows = computeRunningBalance([
			charge({ id: "c1", amount: 200, entryDate: "2026-06-01" }),
			charge({
				id: "c1-rev",
				amount: -200,
				entryDate: "2026-06-02",
				reversesId: "c1",
			}),
		]);

		expect(rows.map((row) => row.runningBalance)).toEqual([200, 0]);
		expect(rows[1]?.reversesId).toBe("c1");
	});

	it("nets a reversed receipt back to the pre-receipt balance", () => {
		const rows = computeRunningBalance([
			charge({ id: "c1", amount: 1500 }),
			receipt({ id: "r1", amount: 1500, entryDate: "2026-05-03" }),
			receipt({
				id: "r1-rev",
				amount: -1500,
				entryDate: "2026-05-04",
				reversesId: "r1",
			}),
		]);

		expect(rows.map((row) => row.runningBalance)).toEqual([1500, 0, 1500]);
	});

	it("keeps the running balance on the numeric(10,2) scale (no float dust)", () => {
		const rows = computeRunningBalance([
			charge({ id: "c1", amount: 1500.1 }),
			receipt({ id: "r1", amount: 0.2, entryDate: "2026-05-03" }),
			receipt({ id: "r2", amount: 1499.9, entryDate: "2026-05-04" }),
		]);

		expect(rows.map((row) => row.runningBalance)).toEqual([1500.1, 1499.9, 0]);
	});

	it("returns an empty array for an empty ledger", () => {
		expect(computeRunningBalance([])).toEqual([]);
	});
});
