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

/**
 * Every figure in this strip is current-calendar-month. `useCollectionRate()`
 * omits `p_month`, so `get_collection_rate` defaults it to
 * `date_trunc('month', current_date)`.
 *
 * That scope MUST be visible. The strip sits directly above the Statements
 * group, whose own description reads "for a period you choose", and above
 * annual tiles (Tax Documents, Year-End) — so an unqualified "$2,000.00" next
 * to them reads as portfolio- or year-scope. The sibling surface on this exact
 * payload already discloses it (`collection-rate-kpi.tsx`: "Collected ÷
 * scheduled, this month"), and this component's own error copy says "this
 * period's". Only the success path was silent.
 */
const PERIOD_LABEL = "this month";

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
						{/*
						 * Screen readers get the period on the figure itself; the
						 * visible caption is not adjacent enough in the a11y tree.
						 *
						 * Carried by sr-only text, NOT `aria-label` on this `<p>`.
						 * The implicit `paragraph` role prohibits `aria-label` and
						 * `aria-labelledby` (axe-core `prohibitedAttrs`), so an
						 * `aria-label` here is discarded by AT and the scoping never
						 * reaches the user it was added for. A unit test cannot catch
						 * that on its own: `getByLabelText` matches the raw attribute
						 * rather than computing an accessible name, so the prohibited
						 * version passed green.
						 */}
						<span className="sr-only">{`${label} ${PERIOD_LABEL}: ${value}`}</span>
						<span aria-hidden="true">{value}</span>
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
	//
	// Clamped at zero because `scheduled` and `collected` are not drawn over the
	// same set of obligations. `get_collection_rate` sums `scheduled` from leases
	// overlapping the month, but sums `collected` from `rent_receipts.received_date`
	// within it — and a receipt's `charge_id` may point at a PRIOR month's charge.
	// So the ordinary late-payment flow (tenant skips January, pays both months on
	// Feb 5) makes February's collected exceed its scheduled, and the raw
	// difference goes negative. "Outstanding -$2,000.00" is not a smaller debt; it
	// is a claim that the owner owes the tenant, which is never what this figure
	// means. Nothing outstanding is the honest reading, and the overpayment is
	// still visible on the collection-rate KPI that reads the same payload.
	const outstanding = data ? Math.max(0, data.scheduled - data.collected) : 0;

	return (
		<div data-testid="reports-summary-strip">
			{/*
			 * Caption is the bare period and nothing else. An earlier draft
			 * prefixed it with a rent-facilitation verb phrase and tripped
			 * marketing-copy-landlord-only.test.ts, which bans that whole family
			 * of wording: TenantFlow facilitates no rent payment, so a caption
			 * implying the product moves money is a positioning violation, not a
			 * wording preference. Do NOT restate the banned phrases here to
			 * explain them — the scanner reads comments too, so documenting the
			 * rule in its own words would re-trip it.
			 */}
			<p className="mb-2 text-sm capitalize text-muted-foreground">
				{PERIOD_LABEL}
			</p>
			<div className="grid gap-4 sm:grid-cols-3">
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
						data && outstanding > CENT_TOLERANCE
							? "text-warning-text"
							: undefined
					}
				/>
			</div>
		</div>
	);
}
