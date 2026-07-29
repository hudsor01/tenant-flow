"use client";

/**
 * Add-line dialog (LEDGER-05, D-05a).
 *
 * MANUAL ONLY. The owner decides when a late fee or any other charge exists;
 * there is no automatic late-fee rule anywhere in this subsystem and no
 * statutory-cap logic. The late/unpaid BADGE on the ledger is derived for
 * display (55-03), and deriving it never posts money — a fee only appears
 * because a human added it here.
 *
 * Sign discipline: the form collects a plain magnitude and the line type sets
 * the sign. `toSignedLineAmount` in the mutation stores credits negative and
 * charges positive, matching the `rent_charges_sign_check` constraint. Nothing
 * in this file negates or scales an amount.
 *
 * MONEY (D-00): dollars in, dollars stored. No cents representation exists in
 * this subsystem (statically enforced by `rent-ledger-money.test.ts`).
 *
 * Toasts: `useAddLineMutation` fires the single "Line added" toast; this form
 * must not toast again.
 */

import { Loader2, Plus } from "lucide-react";
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
import {
	LEDGER_LINE_TYPES,
	type LedgerLineType,
} from "#hooks/api/query-keys/rent-ledger-mutation-options";
import { useAddLineMutation } from "#hooks/api/use-rent-ledger";
import { useAppForm } from "#lib/forms/form-hook";
import { createLogger } from "#lib/frontend-logger";
import {
	LEDGER_DATE_PATTERN,
	LedgerDateField,
	toLedgerDateString,
} from "./ledger-date-field";

const logger = createLogger({ component: "AddLineDialog" });

/** `rent` is cron-generated and `opening` is seeded by track-since, so neither is offered. */
const LINE_TYPE_OPTIONS: ReadonlyArray<{
	value: LedgerLineType;
	label: string;
}> = [
	{ value: "late_fee", label: "Late fee" },
	{ value: "manual_charge", label: "Other charge" },
	{ value: "credit", label: "Credit" },
];

const addLineFormSchema = z.object({
	type: z.enum(LEDGER_LINE_TYPES, {
		error: "Choose whether this is a charge or a credit.",
	}),
	amount: z
		.number({ error: "Enter an amount greater than $0." })
		.positive("Enter an amount greater than $0."),
	date: z.string().regex(LEDGER_DATE_PATTERN, "Choose the date for this line."),
	description: z
		.string()
		.trim()
		.min(1, "Add a short description for this line.")
		.max(500, "Use a shorter description."),
});

function makeDefaultValues() {
	return {
		type: "" as LedgerLineType | "",
		amount: null as number | null,
		date: toLedgerDateString(new Date()),
		description: "",
	};
}

interface AddLineDialogProps {
	leaseId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AddLineDialog({
	leaseId,
	open,
	onOpenChange,
}: AddLineDialogProps) {
	const addLine = useAddLineMutation(leaseId);

	const form = useAppForm({
		defaultValues: makeDefaultValues(),
		// onChange only — see the note in record-receipt-dialog: the calendar sets
		// its value without a blur, and registering the same schema twice renders
		// each message twice.
		validators: { onChange: addLineFormSchema },
		onSubmit: async ({ value, formApi }) => {
			const parsed = addLineFormSchema.safeParse(value);
			if (!parsed.success) return;
			try {
				await addLine.mutateAsync({ leaseId, ...parsed.data });
				formApi.reset(makeDefaultValues());
				onOpenChange(false);
			} catch (error) {
				// The mutation's onError owns the single failure toast; only log here.
				logger.error("Add ledger line failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},
	});

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
						<DialogTitle>Add a charge or credit</DialogTitle>
						<DialogDescription>
							Post a one-off line to this ledger. Rent charges are generated for
							you; everything else is added here, by you.
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div className="mt-4 space-y-4">
							<form.AppField name="type">
								{(field) => (
									<field.SelectField
										label="Type"
										options={LINE_TYPE_OPTIONS}
										placeholder="Choose a type"
									/>
								)}
							</form.AppField>
							<div className="space-y-2">
								<form.AppField name="amount">
									{(field) => (
										<field.NumberField
											label="Amount"
											placeholder="0.00"
											step="0.01"
											min="0"
											inputMode="decimal"
										/>
									)}
								</form.AppField>
								<p className="text-sm text-muted-foreground">
									Enter the amount owed. A charge increases the balance; a
									credit reduces it.
								</p>
							</div>
							<form.AppField name="date">
								{() => <LedgerDateField label="Date" />}
							</form.AppField>
							<form.AppField name="description">
								{(field) => (
									<field.TextareaField
										label="Description"
										placeholder="What is this line for?"
										maxLength={500}
										rows={3}
									/>
								)}
							</form.AppField>
						</div>
					</DialogBody>
					<DialogFooter>
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
									<Button type="submit" disabled={isSubmitting}>
										{isSubmitting ? (
											<Loader2
												aria-hidden="true"
												className="size-4 animate-spin"
											/>
										) : (
											<Plus aria-hidden="true" className="size-4" />
										)}
										{isSubmitting ? "Adding..." : "Add line"}
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
