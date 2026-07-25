"use client";

/**
 * Per-lease Ledger tab (LEDGER-02/03/04/05/06) — the primary owner-facing
 * bookkeeping surface: balance summary, the chronological append-only entry
 * table with derived badges and a running balance, and the record-receipt /
 * add-line / start-tracking / reverse actions.
 *
 * D-04 (honesty): a lease with no `ledger_start_date` has no ledger. It shows
 * the empty state and a "Start tracking rent" CTA — never a fabricated $0.00
 * ledger — and the two write actions stay disabled until tracking starts.
 *
 * D-06 (append-only): nothing here edits or deletes a booked amount. The only
 * correction is "Reverse entry", which APPENDS an offsetting row through the
 * server-side `reverse_charge` / `reverse_receipt` RPCs; the original stays
 * visible, dimmed and struck through.
 *
 * W3 (no drift): the aggregate figures in the balance strip come from the SQL
 * summary RPC. The per-row running balance and paid/partial/unpaid/late badges
 * are derived on the client by `ledger-math`, which mirrors the same 5-day
 * grace and signed-balance rules the RPC uses, because the table is interactive
 * and cannot round-trip the database per row.
 *
 * MONEY (D-00): dollars end to end, rendered through `formatCurrency`. There is
 * no cents representation in this subsystem, so any scaling here would be the
 * v8.0 hundredfold bug (statically enforced by `rent-ledger-money.test.ts`).
 *
 * Toasts: the mutations own the single success and failure toast via
 * `createMutationCallbacks`. Nothing on this surface toasts again.
 */

import { Plus, ReceiptText } from "lucide-react";
import { useState } from "react";
import { Button } from "#components/ui/button";
import { Card, CardContent } from "#components/ui/card";
import { ConfirmDialog } from "#components/ui/confirm-dialog";
import type { LedgerEntryRow } from "#hooks/api/query-keys/rent-ledger-keys";
import {
	useLedgerEntries,
	useLedgerSummary,
	useReverseEntryMutation,
} from "#hooks/api/use-rent-ledger";
import { createLogger } from "#lib/frontend-logger";
import {
	computeRunningBalance,
	deriveChargeState,
} from "#lib/ledger/ledger-math";
import { formatCurrency } from "#lib/utils/currency";
import { AddLineDialog } from "./add-line-dialog";
import { BalanceStrip } from "./ledger-balance-strip";
import {
	LedgerEmptyState,
	LedgerLoadError,
	type LedgerRowView,
	LedgerSkeletonRows,
	LedgerTable,
} from "./ledger-table";
import { LEDGER_TYPE_LABELS } from "./ledger-table-row";
import { RecordReceiptDialog } from "./record-receipt-dialog";
import { TrackSinceDialog } from "./track-since-dialog";

const logger = createLogger({ component: "LedgerTab" });

/** numeric(10,2) dust threshold: below half a cent nothing is still owed. */
const CENT_TOLERANCE = 0.005;

type OpenDialog = "receipt" | "line" | "track" | null;

/**
 * Attach the running balance and the derived per-charge state to the ordered
 * entry stream. A row is voided when it reverses another entry or has itself
 * been reversed; either way it keeps its place on the ledger (D-06) and simply
 * stops offering a state badge or a second reversal.
 */
function buildLedgerRows(
	entries: readonly LedgerEntryRow[],
	today: Date,
): LedgerRowView[] {
	const reversedIds = new Set(
		entries
			.map((entry) => entry.reversesId)
			.filter((id): id is string => id !== null),
	);

	return computeRunningBalance(entries).map((entry) => {
		const isVoided = entry.reversesId !== null || reversedIds.has(entry.id);
		// Opening and credit lines carry their own badge, and receipts are not
		// charges, so paid/partial/unpaid/late applies to real charges only.
		const isStateful =
			entry.kind === "charge" &&
			!isVoided &&
			entry.type !== "opening" &&
			entry.type !== "credit";

		return {
			entry,
			runningBalance: entry.runningBalance,
			state: isStateful
				? deriveChargeState(
						entry.amount,
						entry.receiptsSum,
						entry.dueDate,
						today,
					)
				: null,
			isVoided,
		};
	});
}

/** Reverse-confirmation copy, disclosing the paired receipt reversal. */
function reverseConfirmBody(entry: LedgerEntryRow): string {
	const label =
		entry.description ?? LEDGER_TYPE_LABELS[entry.type] ?? "this entry";
	const body = `This posts an offsetting entry that cancels "${label}" (${formatCurrency(entry.amount)}). The original stays on the ledger for your records. Nothing is deleted.`;

	// Pitfall 4: reversing a charge also reverses every receipt allocated to it,
	// so the owner is told before they confirm.
	return entry.kind === "charge" && entry.receiptsSum > CENT_TOLERANCE
		? `${body} The payments recorded against this charge are reversed at the same time, so the balance nets to zero.`
		: body;
}

function LedgerActions({
	disabled,
	onRecordReceipt,
	onAddLine,
}: {
	disabled: boolean;
	onRecordReceipt: () => void;
	onAddLine: () => void;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			<Button type="button" onClick={onRecordReceipt} disabled={disabled}>
				<ReceiptText className="h-4 w-4" aria-hidden="true" />
				Record receipt
			</Button>
			<Button
				type="button"
				variant="outline"
				onClick={onAddLine}
				disabled={disabled}
			>
				<Plus className="h-4 w-4" aria-hidden="true" />
				Add line
			</Button>
		</div>
	);
}

interface LedgerTabProps {
	leaseId: string;
	/** `leases.ledger_start_date != null` — the lease is being tracked (D-04). */
	isTracked: boolean;
}

export function LedgerTab({ leaseId, isTracked }: LedgerTabProps) {
	const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
	const [pendingReversal, setPendingReversal] = useState<LedgerEntryRow | null>(
		null,
	);
	const summaryQuery = useLedgerSummary(leaseId);
	const entriesQuery = useLedgerEntries(leaseId);
	const reverseEntry = useReverseEntryMutation(leaseId);

	const rows = buildLedgerRows(entriesQuery.data ?? [], new Date());
	// A receipt is always allocated to a specific charge (D-02), so the picker
	// only offers charges that still have something owed and were not reversed.
	const openCharges = rows
		.filter(
			(row) =>
				row.entry.kind === "charge" &&
				!row.isVoided &&
				row.entry.amount - row.entry.receiptsSum > CENT_TOLERANCE,
		)
		.map((row) => row.entry);

	const closeDialog = (open: boolean) =>
		setOpenDialog(open ? openDialog : null);

	const handleConfirmReversal = () => {
		if (!pendingReversal) return;
		// No client amount: reverse_charge / reverse_receipt negate the stored row
		// server-side, so the reversal can never disagree with the original (D-06).
		reverseEntry
			.mutateAsync({
				leaseId,
				entryKind: pendingReversal.kind,
				entryId: pendingReversal.id,
			})
			.then(() => setPendingReversal(null))
			.catch((error: unknown) => {
				// The mutation's onError owns the single failure toast; only log here.
				logger.error("Reverse ledger entry failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			});
	};

	return (
		<div className="space-y-6">
			{isTracked ? <BalanceStrip summary={summaryQuery.data} /> : null}

			<LedgerActions
				disabled={!isTracked}
				onRecordReceipt={() => setOpenDialog("receipt")}
				onAddLine={() => setOpenDialog("line")}
			/>

			{isTracked ? (
				<Card>
					{/* The Table primitive wraps itself in an overflow-x-auto container,
					    so the ledger scrolls sideways on a 375px screen. */}
					<CardContent className="p-0">
						{entriesQuery.isPending ? <LedgerSkeletonRows /> : null}
						{entriesQuery.isError ? (
							<LedgerLoadError onRetry={() => void entriesQuery.refetch()} />
						) : null}
						{!entriesQuery.isPending && !entriesQuery.isError ? (
							<LedgerTable rows={rows} onReverse={setPendingReversal} />
						) : null}
					</CardContent>
				</Card>
			) : (
				<LedgerEmptyState onStart={() => setOpenDialog("track")} />
			)}

			<RecordReceiptDialog
				leaseId={leaseId}
				charges={openCharges}
				open={openDialog === "receipt"}
				onOpenChange={closeDialog}
			/>
			<AddLineDialog
				leaseId={leaseId}
				open={openDialog === "line"}
				onOpenChange={closeDialog}
			/>
			<TrackSinceDialog
				leaseId={leaseId}
				open={openDialog === "track"}
				onOpenChange={closeDialog}
			/>
			<ConfirmDialog
				open={pendingReversal !== null}
				onOpenChange={(open) => {
					if (!open) setPendingReversal(null);
				}}
				title="Reverse this entry?"
				description={pendingReversal ? reverseConfirmBody(pendingReversal) : ""}
				confirmText="Reverse entry"
				confirmVariant="destructive"
				onConfirm={handleConfirmReversal}
				loading={reverseEntry.isPending}
			/>
		</div>
	);
}
