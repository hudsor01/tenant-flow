"use client";

/**
 * The chronological ledger table and its loading / error / no-ledger states
 * (LEDGER-03/04).
 *
 * The table is a plain shadcn `Table`, deliberately NOT virtualized: one
 * lease's ledger is bounded by the months tracked plus its manual lines, so
 * `useVirtualizer` is reserved for the unbounded property and lease list views.
 *
 * Every row view handed in here is already derived — running balance, charge
 * state, voided flag — so this file renders and never computes.
 */

import { ReceiptText, TriangleAlert } from "lucide-react";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { Skeleton } from "#components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#components/ui/table";
import type { LedgerEntryRow } from "#hooks/api/query-keys/rent-ledger-keys";
import type { ChargeState } from "#lib/ledger/ledger-math";
import { LedgerTableRow } from "./ledger-table-row";

/** Money columns are right-aligned so the decimals line up down the column. */
const COLUMNS = [
	{ label: "Date", numeric: false },
	{ label: "Description", numeric: false },
	{ label: "Type", numeric: false },
	{ label: "Charge", numeric: true },
	{ label: "Receipt", numeric: true },
	{ label: "Balance", numeric: true },
	{ label: "Status", numeric: false },
] as const;

/** One fully-derived ledger row, ready to render. */
export interface LedgerRowView {
	entry: LedgerEntryRow;
	runningBalance: number;
	state: ChargeState | null;
	isVoided: boolean;
}

export function LedgerTable({
	rows,
	onReverse,
}: {
	rows: readonly LedgerRowView[];
	onReverse: (entry: LedgerEntryRow) => void;
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					{COLUMNS.map((column) => (
						<TableHead
							key={column.label}
							className={column.numeric ? "text-right" : undefined}
						>
							{column.label}
						</TableHead>
					))}
					<TableHead className="sr-only">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.length === 0 ? (
					<TableRow>
						<TableCell
							colSpan={COLUMNS.length + 1}
							className="py-8 text-center text-sm text-muted-foreground"
						>
							Nothing recorded yet. Record a receipt or add a line to start this
							ledger.
						</TableCell>
					</TableRow>
				) : null}
				{rows.map((row) => (
					<LedgerTableRow
						key={`${row.entry.kind}-${row.entry.id}`}
						entry={row.entry}
						runningBalance={row.runningBalance}
						state={row.state}
						isVoided={row.isVoided}
						{...(row.isVoided ? {} : { onReverse: () => onReverse(row.entry) })}
					/>
				))}
			</TableBody>
		</Table>
	);
}

export function LedgerSkeletonRows() {
	return (
		<div className="space-y-2 p-4" data-testid="ledger-loading">
			{[0, 1, 2, 3, 4].map((row) => (
				<Skeleton key={row} className="h-10 w-full" />
			))}
		</div>
	);
}

export function LedgerLoadError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-col items-center gap-3 p-8 text-center">
			<TriangleAlert
				className="h-8 w-8 text-destructive-text"
				aria-hidden="true"
			/>
			{/* Never a raw PostgREST string: handlePostgrestError already logged it. */}
			<p className="text-sm text-muted-foreground">
				Couldn&apos;t load the ledger.
			</p>
			<Button type="button" variant="outline" onClick={onRetry}>
				Retry
			</Button>
		</div>
	);
}

/**
 * D-04: a lease the owner has not started tracking has NO ledger, so it gets
 * this state rather than an all-zero table that would imply nothing was ever
 * charged.
 */
export function LedgerEmptyState({ onStart }: { onStart: () => void }) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<ReceiptText aria-hidden="true" />
				</EmptyMedia>
				<EmptyTitle>No rent ledger yet</EmptyTitle>
				<EmptyDescription>
					Start tracking to record charges, receipts, and a running balance for
					this lease. Choose a start date and opening balance: no past history
					required.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button type="button" onClick={onStart}>
					Start tracking rent
				</Button>
			</EmptyContent>
		</Empty>
	);
}
