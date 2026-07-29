/**
 * Pure ledger-derivation math for the interactive rent-ledger table
 * (LEDGER-02/03/05). Dollars end-to-end — no cents, no hundredfold scaling
 * (D-00, the v8.0 100x bug class).
 *
 * Scope (W3): the DATABASE is the single source of truth for the aggregate
 * ledger summary and the late count — `get_lease_ledger_summary` (55-02). This
 * module deliberately mirrors that derivation on the client for one reason: the
 * ledger table is interactive (per-row running balance, sorting, filtering) and
 * cannot round-trip the DB per row without breaking that interactivity. The
 * duplication is accepted, explicit, and drift-guarded by unit assertions.
 */

/**
 * Grace period before an unpaid charge counts as late.
 *
 * SOURCE OF TRUTH: the SQL literal `interval '5 days'` in
 * `public.get_lease_ledger_summary`, whose late predicate is
 * `due_date + interval '5 days' < current_date`. The function was introduced in
 * `20260725021100_rent_ledger_rpcs.sql` (55-02) and last revised in
 * `20260726020701_rent_ledger_verification_fixes.sql`, which also made a charge
 * that HAS BEEN reversed stop counting as late (F1) - mirrored below by
 * `deriveChargeState` treating a reversed entry as voided. The DB owns the
 * aggregate summary + late count; this constant is the client-side MIRROR of
 * that literal for per-row badge rendering only (W3).
 *
 * The two must never diverge: `rent-ledger-balance.test.ts` asserts
 * `GRACE_PERIOD_DAYS === 5` so a change to the SQL interval (or to this value)
 * fails the suite until both sides are updated together (T-55-12). Grace is a
 * single fixed constant in v10 — never a per-lease or per-owner config knob
 * (D-03).
 */
export const GRACE_PERIOD_DAYS = 5;

/** Milliseconds in a UTC calendar day. */
const MS_PER_DAY = 86_400_000;

/**
 * numeric(10,2) tolerance: ledger amounts carry two decimal places, so anything
 * smaller than half a cent is float dust, not a real balance. Used instead of
 * rounding so this module contains no money-scale arithmetic at all.
 */
const CENT_TOLERANCE = 0.005;

/** One entry in a lease's chronological ledger stream (charge or receipt). */
export type LedgerEntry = {
	id: string;
	kind: "charge" | "receipt";
	/** 'rent' | 'late_fee' | 'manual_charge' | 'credit' | 'opening' for charges. */
	type: string;
	/** Signed DOLLARS. Credits and reversals are negative. */
	amount: number;
	/** YYYY-MM-DD. */
	entryDate: string;
	/** YYYY-MM-DD; charges only. */
	dueDate: string | null;
	/** Set when this entry negates another entry (append-only correction). */
	reversesId: string | null;
	/** Charges only: the charge this receipt is allocated against. */
	chargeId: string | null;
	/** Charges only: sum of receipts allocated to this charge, in DOLLARS. */
	receiptsSum: number;
};

/** Derived per-charge state rendered as a badge. Never stored. */
export type ChargeState = "paid" | "partial" | "unpaid" | "late";

/**
 * A ledger entry with its cumulative balance at that point in the stream.
 *
 * Generic over the entry so a richer row (the mapper's `LedgerEntryRow`, which
 * adds `description` / `method`) keeps its extra columns through the
 * derivation instead of being narrowed back to the base contract.
 */
export type LedgerEntryWithBalance<T extends LedgerEntry = LedgerEntry> = T & {
	runningBalance: number;
};

/**
 * Round a dollar figure to the numeric(10,2) scale the database stores, so
 * accumulated float error never surfaces in the running balance.
 */
function toLedgerScale(value: number): number {
	return Number(value.toFixed(2));
}

/**
 * Parse a YYYY-MM-DD ledger date as UTC midnight. Returns NaN for anything
 * unparseable so callers can degrade instead of throwing.
 */
function parseLedgerDate(date: string): number {
	return Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
}

/**
 * Is this charge past its grace window with money still owed?
 *
 * Mirrors the SQL predicate `remaining > 0 AND due_date + interval '5 days' <
 * current_date`: the day that is exactly `due_date + GRACE_PERIOD_DAYS` is NOT
 * late, the following day IS. Compared on the UTC calendar day to match the
 * database's `current_date`. A charge with no due date is never late.
 */
export function isLate(
	remaining: number,
	dueDate: string | null,
	today: Date,
): boolean {
	if (dueDate === null) return false;
	if (remaining <= CENT_TOLERANCE) return false;

	const dueMs = parseLedgerDate(dueDate);
	if (Number.isNaN(dueMs)) return false;

	const graceEndsMs = dueMs + GRACE_PERIOD_DAYS * MS_PER_DAY;
	const todayMs = Date.UTC(
		today.getUTCFullYear(),
		today.getUTCMonth(),
		today.getUTCDate(),
	);

	return todayMs > graceEndsMs;
}

/**
 * Derive a charge's paid/partial/unpaid/late state from the receipts allocated
 * against it. Precedence is paid -> late -> partial -> unpaid: a charge with a
 * remaining balance past the grace window reads as late even when it was
 * partially paid, matching the SQL late derivation (55-02).
 */
export function deriveChargeState(
	chargeAmount: number,
	receiptsSum: number,
	dueDate: string | null,
	today: Date,
): ChargeState {
	const remaining = chargeAmount - receiptsSum;

	if (remaining <= CENT_TOLERANCE) return "paid";
	if (isLate(remaining, dueDate, today)) return "late";
	if (receiptsSum > CENT_TOLERANCE) return "partial";
	return "unpaid";
}

/**
 * Attach a cumulative running balance to an already-ordered entry stream.
 *
 * Balance is the signed dollar total `Σ(charges) − Σ(receipts)` at each row:
 * charges add their signed amount (so a negative credit line reduces the
 * balance), receipts subtract theirs. Reversal rows carry the negated amount of
 * the entry they cancel, so a reversed pair nets back to zero (D-06).
 *
 * Generic over the entry type so the caller's row shape survives: the ledger
 * table feeds this `LedgerEntryRow[]` and still reads `description` / `method`
 * off the result, with no type assertion at the call site.
 */
export function computeRunningBalance<T extends LedgerEntry>(
	orderedEntries: readonly T[],
): LedgerEntryWithBalance<T>[] {
	let balance = 0;

	return orderedEntries.map((entry) => {
		balance = toLedgerScale(
			entry.kind === "charge" ? balance + entry.amount : balance - entry.amount,
		);
		return { ...entry, runningBalance: balance };
	});
}
