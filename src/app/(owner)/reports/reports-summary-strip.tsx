"use client";

/**
 * The D-30 `/reports` hub summary strip.
 *
 * This is the ONLY data dependency on the hub index — the statement tiles
 * beside it are static markup, so a failure here can never take the directory
 * down with it.
 *
 * MONEY (Phase 55 D-00): the values are DOLLARS from the RPC, handed straight
 * to `formatCurrency` with `tabular-nums`. No scaling anywhere in this file —
 * a stray `* 100` caused a real 100x overstatement in v8.0.
 *
 * D-18/D-30 (load-bearing): all three figures come from ONE
 * `get_collection_rate` payload, and Outstanding is `scheduled - collected`
 * from that SAME object. It must never be sourced from
 * `get_financial_overview.accounts_receivable`, which is a different,
 * lease-derived notion of outstanding — two derivations wearing one label is
 * exactly the failure D-18 forbids. Scheduled and Collected are never summed;
 * subtraction within one period is the defined complement of the collection
 * rate and is permitted.
 */

import { Banknote, CalendarClock, Clock, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";
import { useCollectionRate } from "#hooks/api/use-owner-dashboard-financial";
import { cn } from "#lib/utils";
import { formatCurrency } from "#lib/utils/currency";

/** numeric(10,2) dust threshold: below half a cent nothing is still owed. */
const CENT_TOLERANCE = 0.005;

function MetricCard({
	icon: Icon,
	label,
	value,
	valueClassName,
}: {
	icon: LucideIcon;
	label: string;
	/** null while the payload is loading, which renders a skeleton instead. */
	value: string | null;
	// `| undefined` is required under `exactOptionalPropertyTypes`: the two
	// conditional tiles below pass `undefined` for the neutral default.
	valueClassName?: string | undefined;
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
					<Icon className="h-4 w-4" aria-hidden="true" />
					{label}
				</div>
				{value === null ? (
					<Skeleton className="h-7 w-24" />
				) : (
					<p
						className={cn(
							"text-xl font-semibold tabular-nums leading-snug",
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

export function ReportsSummaryStrip() {
	const { data, isPending, isError } = useCollectionRate();

	if (isError || (!data && !isPending)) {
		return (
			<div
				className="grid gap-4 sm:grid-cols-3"
				data-testid="reports-summary-strip"
			>
				<p className="text-sm text-muted-foreground">
					Couldn&apos;t load this period&apos;s collection figures.
				</p>
			</div>
		);
	}

	// Single-source rule: every figure below reads off this one payload.
	const outstanding = data ? data.scheduled - data.collected : 0;

	return (
		<div
			className="grid gap-4 sm:grid-cols-3"
			data-testid="reports-summary-strip"
		>
			<MetricCard
				icon={CalendarClock}
				label="Scheduled"
				value={data ? formatCurrency(data.scheduled) : null}
			/>
			<MetricCard
				icon={Banknote}
				label="Collected"
				value={data ? formatCurrency(data.collected) : null}
				valueClassName={
					data && data.collected > 0 ? "text-success-text" : undefined
				}
			/>
			<MetricCard
				icon={Clock}
				label="Outstanding"
				value={data ? formatCurrency(outstanding) : null}
				valueClassName={
					data && outstanding > CENT_TOLERANCE ? "text-warning-text" : undefined
				}
			/>
		</div>
	);
}
