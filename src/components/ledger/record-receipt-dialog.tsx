"use client";

/**
 * Record-receipt dialog (LEDGER-02, D-02).
 *
 * Bookkeeping, not facilitation. The owner logs a payment they ALREADY
 * received, against a SPECIFIC charge. `method` is a free-text LABEL (cash,
 * check, Zelle) with suggested chips — there is no rail, no card form, no
 * "pay now", and nothing here ever moves money.
 *
 * Per-charge allocation (D-02): a receipt always names the charge it pays down.
 * A partial payment is simply an amount smaller than what remains, recorded as
 * its own receipt; several receipts against one charge are expected and the
 * form never objects. Overpaying is allowed too and lands as a credit balance,
 * which is why no maximum is enforced against the remaining amount.
 *
 * MONEY (D-00): dollars end to end. The amount input collects dollars, zod
 * validates dollars, the mutation writes `numeric(10,2)` dollars, and the
 * charge picker renders with `formatCurrency`. No cents representation exists
 * in this subsystem, so any scaling would be the v8.0 hundredfold bug
 * (statically enforced by `rent-ledger-money.test.ts`).
 *
 * Toasts: `useRecordReceiptMutation` already fires the single "Payment
 * recorded" toast via `createMutationCallbacks`. This form must not toast again.
 */

import { format, parseISO } from "date-fns";
import { Loader2, ReceiptText, Tag } from "lucide-react";
import { z } from "zod";
import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import { useRecordReceiptMutation } from "#hooks/api/use-rent-ledger";
import { useAppForm } from "#lib/forms/form-hook";
import { createLogger } from "#lib/frontend-logger";
import type { LedgerEntry } from "#lib/ledger/ledger-math";
import { formatCurrency } from "#lib/utils/currency";
import {
	LEDGER_DATE_PATTERN,
	LedgerDateField,
	toLedgerDateString,
} from "./ledger-date-field";

const logger = createLogger({ component: "RecordReceiptDialog" });

/**
 * Suggested labels only. These are words an owner writes on a paper ledger, not
 * payment rails: picking one fills the free-text input and nothing else.
 */
const METHOD_SUGGESTIONS = [
	"Cash",
	"Check",
	"Zelle",
	"Venmo",
	"ACH (manual)",
	"Money order",
	"Other",
] as const;

const CHARGE_TYPE_LABELS: Record<string, string> = {
	rent: "Rent",
	late_fee: "Late fee",
	manual_charge: "Other charge",
	opening: "Opening balance",
	credit: "Credit",
};

const recordReceiptFormSchema = z.object({
	chargeId: z.uuid({ message: "Choose which charge this payment applies to." }),
	amount: z
		.number({ error: "Enter an amount greater than $0." })
		.positive("Enter an amount greater than $0."),
	receivedDate: z
		.string()
		.regex(LEDGER_DATE_PATTERN, "Choose the date you received this payment."),
	method: z
		.string()
		.trim()
		.min(1, "Add a label for how this was received (cash, check, Zelle).")
		.max(40, "Use a shorter label for how this was received."),
});

/** "Rent July 2026" / "Late fee Jul 3, 2026" — the period the charge covers. */
function chargePeriodLabel(charge: LedgerEntry): string {
	const typeLabel = CHARGE_TYPE_LABELS[charge.type] ?? "Charge";
	const parsed = parseISO(charge.entryDate);
	if (Number.isNaN(parsed.getTime())) return typeLabel;
	return charge.type === "rent"
		? `${typeLabel} ${format(parsed, "MMMM yyyy")}`
		: `${typeLabel} ${format(parsed, "MMM d, yyyy")}`;
}

function makeDefaultValues() {
	return {
		chargeId: "",
		amount: null as number | null,
		receivedDate: toLedgerDateString(new Date()),
		method: "",
	};
}

interface RecordReceiptDialogProps {
	leaseId: string;
	/** Open/partial charges this payment can be applied to. */
	charges: readonly LedgerEntry[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function RecordReceiptDialog({
	leaseId,
	charges,
	open,
	onOpenChange,
}: RecordReceiptDialogProps) {
	const recordReceipt = useRecordReceiptMutation(leaseId);

	const form = useAppForm({
		defaultValues: makeDefaultValues(),
		// onChange ONLY, deliberately:
		//  - not onBlur, because the method chips and the calendar popover set
		//    values programmatically without ever blurring a field, and TanStack's
		//    `handleSubmit` early-returns on a stale `canSubmit` before it
		//    revalidates — a filled form would refuse to submit.
		//  - not additionally onSubmit, because submitting runs the onChange,
		//    onBlur and onSubmit validators together; registering the same schema
		//    twice writes the same message under two errorMap keys and the field
		//    renders it twice.
		// `FieldError` only renders for touched fields, and `handleSubmit` touches
		// every field, so an untouched form stays quiet until it is submitted.
		validators: { onChange: recordReceiptFormSchema },
		onSubmit: async ({ value, formApi }) => {
			// Re-parse rather than narrow by hand: the same schema that produced the
			// field errors also produces the mutation payload, so `amount` arrives as
			// a number without a cast and the two can never disagree.
			const parsed = recordReceiptFormSchema.safeParse(value);
			if (!parsed.success) return;
			try {
				await recordReceipt.mutateAsync({ leaseId, ...parsed.data });
				formApi.reset(makeDefaultValues());
				onOpenChange(false);
			} catch (error) {
				// The mutation's onError owns the single failure toast; only log here.
				logger.error("Record receipt failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},
	});

	const chargeOptions = charges.map((charge) => ({
		value: charge.id,
		label: `${chargePeriodLabel(charge)} · ${formatCurrency(charge.amount - charge.receiptsSum)} due`,
	}));
	const hasCharges = chargeOptions.length > 0;

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) form.reset(makeDefaultValues());
		onOpenChange(nextOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent intent="create" className="sm:max-w-125">
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>Record a payment received</DialogTitle>
						<DialogDescription>
							Log money you have already received against a single charge.
							Recording a partial payment is fine: add one receipt per payment.
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div className="mt-4 space-y-4">
							<form.AppField name="chargeId">
								{(field) => (
									<field.SelectField
										label="Applies to charge"
										options={chargeOptions}
										placeholder={
											hasCharges ? "Choose a charge" : "No charges yet"
										}
										disabled={!hasCharges}
									/>
								)}
							</form.AppField>
							{hasCharges ? null : (
								<p className="text-sm text-muted-foreground">
									This ledger has no charges yet. Start tracking rent or add a
									line first, then record the payment against it.
								</p>
							)}
							<form.AppField name="amount">
								{(field) => (
									<field.NumberField
										label="Amount received"
										placeholder="0.00"
										step="0.01"
										min="0"
										inputMode="decimal"
										// Primary field of a deliberately-opened dialog (CLAUDE.md
										// forms convention: autoFocus the primary input).
										autoFocus
									/>
								)}
							</form.AppField>
							<form.AppField name="receivedDate">
								{() => <LedgerDateField label="Date received" />}
							</form.AppField>
							<form.AppField name="method">
								{(field) => (
									<div className="space-y-2">
										<field.IconInputField
											label="Method"
											icon={Tag}
											placeholder="Cash, check, Zelle"
											maxLength={40}
											description="A label only: cash, check, Zelle. TenantFlow does not move money."
										/>
										<div className="flex flex-wrap gap-2">
											{METHOD_SUGGESTIONS.map((suggestion) => (
												<Button
													key={suggestion}
													type="button"
													variant="outline"
													size="sm"
													onClick={() => field.handleChange(suggestion)}
												>
													{suggestion}
												</Button>
											))}
										</div>
									</div>
								)}
							</form.AppField>
						</div>
					</DialogBody>
					<DialogFooter>
						{/* Deliberately NOT gated on `canSubmit`. A form-level onBlur
						    validator invalidates the whole form on every blur, so a
						    canSubmit-disabled button disables itself on the blur that the
						    submit click itself causes and swallows that click. Submitting
						    an invalid form is the accessible behaviour anyway: it marks
						    every field touched and surfaces all validation copy at once. */}
						<form.Subscribe selector={(state) => state.isSubmitting}>
							{(isSubmitting) => (
								<>
									<Button
										type="button"
										variant="outline"
										onClick={() => handleOpenChange(false)}
										disabled={isSubmitting}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={isSubmitting || !hasCharges}>
										{isSubmitting ? (
											<Loader2
												aria-hidden="true"
												className="size-4 animate-spin"
											/>
										) : (
											<ReceiptText aria-hidden="true" className="size-4" />
										)}
										{isSubmitting ? "Recording..." : "Record receipt"}
									</Button>
								</>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
