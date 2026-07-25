/**
 * Rent-ledger mutation options — record receipt, add manual line, start
 * tracking, reverse entry (LEDGER-02/04/05/06). Split from
 * `rent-ledger-keys.ts` (the read half) to keep both files under the 300-line
 * cap; import from the defining file, no barrel re-exports.
 *
 * MONEY BOUNDARY (D-00): every amount written here is `numeric(10,2)` DOLLARS.
 * The dialogs collect dollars, zod validates dollars, and the insert carries
 * dollars — there is no cents representation in this subsystem, so any scaling
 * would be the v8.0 MONEY-01/02 hundredfold bug. `rent-ledger-money.test.ts`
 * (55-03) statically scans this file.
 *
 * APPEND-ONLY (D-06): corrections never edit or delete. `reverseEntry` calls the
 * server-side `reverse_charge` / `reverse_receipt` RPCs, which post the EXACT
 * negation — and, for a charge, the paired negation of every receipt allocated
 * to it — inside one transaction. The client deliberately does NOT compose a
 * negative insert: a client-supplied amount carries no guarantee that it matches
 * the row it cancels, and a mismatch would silently corrupt the lease balance.
 *
 * Analog: the `mutationOptions()` blocks in `document-keys.ts`.
 */

import { mutationOptions } from "@tanstack/react-query";
import { z } from "zod";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { requireOwnerUserId } from "#lib/require-owner-user-id";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import { uuidSchema } from "#lib/validation/common";
import { mutationKeys } from "../mutation-keys";

/** Widest value a `numeric(10,2)` column holds: 8 integer digits + 2 decimals. */
const MAX_LEDGER_AMOUNT = 99_999_999.99;

/** Ledger dates are plain calendar days (`date` columns), never timestamps. */
const LEDGER_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validation messages are the user-facing copy from the phase UI-SPEC — they
// surface verbatim in the failure toast via handleMutationError.
const amountSchema = z
	.number({ error: "Enter an amount greater than $0." })
	.positive("Enter an amount greater than $0.")
	.max(MAX_LEDGER_AMOUNT, "That amount is too large to record.");

const ledgerDateSchema = z
	.string({ error: "Choose a date." })
	.regex(LEDGER_DATE_RE, "Choose a valid date.");

/**
 * Manual line types an owner can post. `rent` is cron-generated and `opening`
 * is written by `start_lease_ledger`, so neither is offered here.
 */
export const LEDGER_LINE_TYPES = [
	"late_fee",
	"manual_charge",
	"credit",
] as const;
export type LedgerLineType = (typeof LEDGER_LINE_TYPES)[number];

const recordReceiptSchema = z.object({
	chargeId: z.uuid({ message: "Choose which charge this payment applies to." }),
	leaseId: uuidSchema,
	amount: amountSchema,
	method: z
		.string()
		.trim()
		.min(1, "Add a label for how this was received (cash, check, Zelle).")
		.max(40, "Use a shorter label for how this was received."),
	receivedDate: ledgerDateSchema,
});

const addLineSchema = z.object({
	leaseId: uuidSchema,
	type: z.enum(LEDGER_LINE_TYPES, {
		error: "Choose whether this is a charge or a credit.",
	}),
	amount: amountSchema,
	date: ledgerDateSchema,
	description: z
		.string()
		.trim()
		.min(1, "Add a short description for this line.")
		.max(500, "Use a shorter description."),
});

const startTrackingSchema = z.object({
	leaseId: uuidSchema,
	startDate: ledgerDateSchema,
	openingBalance: z
		.number({ error: "Enter the balance owed (0 if the tenant was current)." })
		.min(-MAX_LEDGER_AMOUNT, "That balance is too large to record.")
		.max(MAX_LEDGER_AMOUNT, "That balance is too large to record."),
});

const reverseEntrySchema = z.object({
	leaseId: uuidSchema,
	entryKind: z.enum(["charge", "receipt"]),
	entryId: uuidSchema,
});

export type RecordReceiptInput = z.infer<typeof recordReceiptSchema>;
export type AddLineInput = z.infer<typeof addLineSchema>;
export type StartTrackingInput = z.infer<typeof startTrackingSchema>;
export type ReverseEntryInput = z.infer<typeof reverseEntrySchema>;

function parseLedgerInput<S extends z.ZodType>(
	schema: S,
	input: unknown,
): z.infer<S> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw new Error(
			parsed.error.issues.map((issue) => issue.message).join(" "),
		);
	}
	return parsed.data;
}

/**
 * Sign discipline matching the `rent_charges_sign_check` constraint: credits are
 * stored NEGATIVE, charges POSITIVE. The dialog collects a plain magnitude and
 * the line type decides the sign — negation, not scaling.
 */
export function toSignedLineAmount(
	type: LedgerLineType,
	amount: number,
): number {
	return type === "credit" ? -amount : amount;
}

async function currentOwnerUserId(): Promise<string> {
	const user = await getCachedUser();
	return requireOwnerUserId(user?.id);
}

export const rentLedgerMutations = {
	recordReceipt: () =>
		mutationOptions<void, Error, RecordReceiptInput>({
			mutationKey: mutationKeys.rentLedger.recordReceipt,
			mutationFn: async (input) => {
				const { chargeId, leaseId, amount, method, receivedDate } =
					parseLedgerInput(recordReceiptSchema, input);
				const supabase = createClient();
				const ownerUserId = await currentOwnerUserId();

				// Per-charge allocation (D-02): a receipt always names the charge it
				// pays down. A partial payment is simply a receipt for less than the
				// remaining balance; multiple receipts per charge are expected.
				const { error } = await supabase.from("rent_receipts").insert({
					charge_id: chargeId,
					lease_id: leaseId,
					owner_user_id: ownerUserId,
					amount,
					method,
					received_date: receivedDate,
				});
				if (error) handlePostgrestError(error, "rent receipts");
			},
		}),

	addLine: () =>
		mutationOptions<void, Error, AddLineInput>({
			mutationKey: mutationKeys.rentLedger.addLine,
			mutationFn: async (input) => {
				const { leaseId, type, amount, date, description } = parseLedgerInput(
					addLineSchema,
					input,
				);
				const supabase = createClient();
				const ownerUserId = await currentOwnerUserId();

				const { error } = await supabase.from("rent_charges").insert({
					lease_id: leaseId,
					owner_user_id: ownerUserId,
					type,
					amount: toSignedLineAmount(type, amount),
					period_start: date,
					due_date: date,
					description,
				});
				if (error) handlePostgrestError(error, "rent charges");
			},
		}),

	startTracking: () =>
		mutationOptions<void, Error, StartTrackingInput>({
			mutationKey: mutationKeys.rentLedger.startTracking,
			mutationFn: async (input) => {
				const { leaseId, startDate, openingBalance } = parseLedgerInput(
					startTrackingSchema,
					input,
				);
				const supabase = createClient();

				// Sets leases.ledger_start_date and posts the opening-balance line in
				// one transaction (D-04). No history backfill.
				const { error } = await supabase.rpc("start_lease_ledger", {
					p_lease_id: leaseId,
					p_start_date: startDate,
					p_opening_balance: openingBalance,
				});
				if (error) handlePostgrestError(error, "start lease ledger");
			},
		}),

	reverseEntry: () =>
		mutationOptions<void, Error, ReverseEntryInput>({
			mutationKey: mutationKeys.rentLedger.reverseEntry,
			mutationFn: async (input) => {
				const { entryKind, entryId } = parseLedgerInput(
					reverseEntrySchema,
					input,
				);
				const supabase = createClient();

				// Server-side exact negation (D-06). reverse_charge also negates every
				// receipt allocated to the charge, so a reversed pair nets to zero and
				// no orphan receipt leaves a phantom credit.
				const { error } =
					entryKind === "charge"
						? await supabase.rpc("reverse_charge", { p_charge_id: entryId })
						: await supabase.rpc("reverse_receipt", { p_receipt_id: entryId });
				if (error) handlePostgrestError(error, "reverse ledger entry");
			},
		}),
};
