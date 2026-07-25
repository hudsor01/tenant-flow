"use client";

/**
 * Per-lease balance summary strip (LEDGER-03).
 *
 * The three figures come from `get_lease_ledger_summary` — the DATABASE is the
 * source of truth for the aggregate balance and the late count (W3/T-55-12).
 * Nothing here re-derives them from the entry stream, so the strip can never
 * disagree with the server.
 *
 * MONEY (D-00): dollars straight from the RPC through `formatCurrency`, with
 * `tabular-nums` so the three cards line up. No scaling anywhere.
 */

import { DollarSign, ReceiptText, Scale } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";
import type { LedgerSummary } from "#hooks/api/query-keys/rent-ledger-keys";
import { cn } from "#lib/utils";
import { formatCurrency } from "#lib/utils/currency";

/** numeric(10,2) dust threshold: below half a cent nothing is still owed. */
const CENT_TOLERANCE = 0.005;

function MetricCard({
	icon: Icon,
	label,
	value,
	valueClassName,
	children,
}: {
	icon: typeof DollarSign;
	label: string;
	/** null while the summary is loading, which renders a skeleton instead. */
	value: string | null;
	valueClassName?: string;
	children?: ReactNode;
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
					<Icon className="h-4 w-4" aria-hidden="true" />
					{label}
					{children}
				</div>
				{value === null ? (
					<Skeleton className="h-7 w-24" />
				) : (
					<p
						className={cn("text-xl font-semibold tabular-nums", valueClassName)}
					>
						{value}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export function BalanceStrip({
	summary,
}: {
	summary: LedgerSummary | undefined;
}) {
	// Positive balance = the tenant owes money. Zero or negative (a credit
	// balance from an overpayment) reads as settled.
	const isOwed = (summary?.balance ?? 0) > CENT_TOLERANCE;

	return (
		<div className="grid gap-4 sm:grid-cols-3">
			<MetricCard
				icon={Scale}
				label="Balance"
				value={summary ? formatCurrency(summary.balance) : null}
				valueClassName={isOwed ? "text-destructive-text" : "text-success-text"}
			>
				{summary && summary.lateCount > 0 ? (
					<span className="rounded-md border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive-text">
						{summary.lateCount} late
					</span>
				) : null}
			</MetricCard>
			<MetricCard
				icon={DollarSign}
				label="Charged"
				value={summary ? formatCurrency(summary.chargesTotal) : null}
			/>
			<MetricCard
				icon={ReceiptText}
				label="Received"
				value={summary ? formatCurrency(summary.receiptsTotal) : null}
			/>
		</div>
	);
}
