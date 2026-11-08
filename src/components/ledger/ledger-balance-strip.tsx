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
	className,
	children,
}: {
	icon: typeof DollarSign;
	label: string;
	/** null while the summary is loading, which renders a skeleton instead. */
	value: string | null;
	valueClassName?: string;
	/** The tile's own classes: its span in the strip's grid. */
	className?: string;
	children?: ReactNode;
}) {
	// The v4 Card pads itself (py-6) and CardContent pads its sides (px-6): a
	// 16px tile sets py-4 on the Card and px-4 here, not a v3 p-4 on top of
	// the Card's own padding. mb-0: the figure is the content's last child,
	// where the base `p` margin would stand under it.
	return (
		<Card className={cn("py-4", className)}>
			<CardContent className="px-4">
				<div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
					<Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
					{label}
					{children}
				</div>
				{value === null ? (
					<Skeleton className="h-7 w-24" />
				) : (
					<p
						className={cn(
							"mb-0 whitespace-nowrap text-xl font-semibold tabular-nums",
							valueClassName,
						)}
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

	// The columns step on the strip's own width, never the viewport's (66.2-39
	// fix round 4, Part 8c): it sits in the lease page's two-thirds column,
	// whose width the rail sets. One column until two tiles hold the Balance
	// label with its late badge and $1,234,567.00, then Received under the
	// first two, all three in a row from where three do.
	return (
		<div className="@container/ledger-balance">
			<div className="grid grid-cols-1 gap-4 @min-[25rem]/ledger-balance:grid-cols-2 @min-[38rem]/ledger-balance:grid-cols-3">
				<MetricCard
					icon={Scale}
					label="Balance"
					value={summary ? formatCurrency(summary.balance) : null}
					valueClassName={
						isOwed ? "text-destructive-text" : "text-success-text"
					}
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
					className="@min-[25rem]/ledger-balance:col-span-2 @min-[38rem]/ledger-balance:col-span-1"
				/>
			</div>
		</div>
	);
}
