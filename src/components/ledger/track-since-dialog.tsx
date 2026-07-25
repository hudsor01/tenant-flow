"use client";

/**
 * Track-since onboarding dialog (LEDGER-04, D-04).
 *
 * The ledger starts where the owner says it starts. No history is rebuilt and
 * nothing is imported: `start_lease_ledger` writes `leases.ledger_start_date`
 * and one `type='opening'` line carrying the balance owed on that date, in a
 * single transaction.
 *
 * WHY THE AUTO-GENERATION NOTE IS LOAD-BEARING (W1): charge generation is NOT
 * prorated. Starting to track part-way through a month still produces a full
 * month of rent for that month, so an owner who also folds that month's unpaid
 * rent into the opening balance would double-count it. The note below tells
 * them that before they type a number, which is the difference between a ledger
 * that reconciles and one that is silently a month's rent too high.
 *
 * MONEY (D-00): dollars. The opening balance is a `numeric(10,2)` dollar figure
 * and 0 is a legitimate answer (the tenant was current).
 *
 * Toasts: `useStartTrackingMutation` fires the single "Rent tracking started"
 * toast; this form must not toast again.
 */

import { CalendarPlus, Info, Loader2 } from "lucide-react";
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
import { useStartTrackingMutation } from "#hooks/api/use-rent-ledger";
import { useAppForm } from "#lib/forms/form-hook";
import { createLogger } from "#lib/frontend-logger";
import {
	LEDGER_DATE_PATTERN,
	LedgerDateField,
	toLedgerDateString,
} from "./ledger-date-field";

const logger = createLogger({ component: "TrackSinceDialog" });

/** Widest value a `numeric(10,2)` column holds: 8 integer digits + 2 decimals. */
const MAX_LEDGER_AMOUNT = 99_999_999.99;

const trackSinceFormSchema = z.object({
	startDate: z
		.string()
		.regex(LEDGER_DATE_PATTERN, "Choose a start date for the ledger."),
	openingBalance: z
		.number({ error: "Enter the balance owed (0 if the tenant was current)." })
		.min(-MAX_LEDGER_AMOUNT, "That balance is too large to record.")
		.max(MAX_LEDGER_AMOUNT, "That balance is too large to record."),
});

function makeDefaultValues() {
	return {
		startDate: toLedgerDateString(new Date()),
		openingBalance: null as number | null,
	};
}

interface TrackSinceDialogProps {
	leaseId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function TrackSinceDialog({
	leaseId,
	open,
	onOpenChange,
}: TrackSinceDialogProps) {
	const startTracking = useStartTrackingMutation(leaseId);

	const form = useAppForm({
		defaultValues: makeDefaultValues(),
		// onChange only — see the note in record-receipt-dialog: the calendar sets
		// its value without a blur, and registering the same schema twice renders
		// each message twice.
		validators: { onChange: trackSinceFormSchema },
		onSubmit: async ({ value, formApi }) => {
			const parsed = trackSinceFormSchema.safeParse(value);
			if (!parsed.success) return;
			try {
				await startTracking.mutateAsync({ leaseId, ...parsed.data });
				formApi.reset(makeDefaultValues());
				onOpenChange(false);
			} catch (error) {
				// The mutation's onError owns the single failure toast; only log here.
				logger.error("Start rent tracking failed", {
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
						<DialogTitle>Start tracking rent for this lease</DialogTitle>
						<DialogDescription>
							Pick the date to start the ledger from and the balance owed on
							that date. History before this date isn&apos;t rebuilt.
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div className="mt-4 space-y-4">
							<form.AppField name="startDate">
								{() => (
									<LedgerDateField label="Start tracking from" autoFocus />
								)}
							</form.AppField>
							<form.AppField name="openingBalance">
								{(field) => (
									<field.NumberField
										label="Balance owed as of this date"
										placeholder="0.00"
										step="0.01"
										inputMode="decimal"
									/>
								)}
							</form.AppField>
							<p className="text-sm text-muted-foreground">
								Enter 0 if the tenant was current.
							</p>
							<div className="flex gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
								<Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
								<p>
									Rent for the month you start tracking is added automatically.
									Size your opening balance accordingly.
								</p>
							</div>
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
											<CalendarPlus aria-hidden="true" className="size-4" />
										)}
										{isSubmitting ? "Starting..." : "Start tracking rent"}
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
