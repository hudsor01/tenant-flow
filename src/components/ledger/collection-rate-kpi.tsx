"use client";

/**
 * Collection-rate KPI tile (LEDGER-08, D-08).
 *
 * The rate is `collected ÷ scheduled` for the current month, computed in SQL by
 * `get_collection_rate` from ledger actuals. This KPI was dropped in v2.0
 * because there was no honest data behind it; the rent ledger now supplies it.
 *
 * Two honesty rules are load-bearing here:
 *   1. An owner with nothing scheduled sees a real 0% plus a "start tracking"
 *      helper — never a hidden tile and never a fabricated number.
 *   2. The rate is the ONLY place scheduled and collected combine, and they
 *      combine as a ratio (D-07). Nothing on this surface sums them.
 *
 * MONEY (D-00): `rate` arrives from SQL as a 0-100 percentage already. It is
 * handed to `formatPercentage` untouched — no scaling anywhere in this file
 * (statically enforced by `rent-ledger-money.test.ts`).
 */

import {
	CircleCheck,
	CircleDashed,
	TrendingDown,
	TrendingUp,
	TriangleAlert,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { NumberTicker } from "#components/ui/number-ticker";
import { Skeleton } from "#components/ui/skeleton";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatValue,
} from "#components/ui/stat";
import { useCollectionRate } from "#hooks/api/use-owner-dashboard-financial";
import { useReducedMotion } from "#hooks/use-reduced-motion";
import { formatPercentage, getCollectionRateStatus } from "#lib/utils/currency";

type StatusIcon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * `getCollectionRateStatus` ships placeholder LABEL strings in its `icon` field
 * (bracketed ASCII markers, not glyphs). Rendering them would print literal
 * text into the card, so that field is deliberately never read here: the status
 * WORD selects a lucide component instead, lucide being the sole icon library.
 * `collection-rate-kpi.test.tsx` asserts none of those markers reach the DOM.
 */
const STATUS_ICONS: Record<string, StatusIcon> = {
	Excellent: TrendingUp,
	Good: CircleCheck,
	Fair: TriangleAlert,
	Poor: TrendingDown,
};

/** Mirrors the dashboard bento's reduced-motion contract for animated values. */
function CollectionRateValue({ rate }: { rate: number }) {
	const reducedMotion = useReducedMotion();

	if (reducedMotion) {
		return (
			<span className="inline-block tabular-nums tracking-wider">
				{formatPercentage(rate)}
			</span>
		);
	}

	return (
		<>
			<NumberTicker
				value={rate}
				decimalPlaces={Number.isInteger(rate) ? 0 : 1}
				duration={800}
			/>
			<span aria-hidden="true">%</span>
		</>
	);
}

function CollectionRateSkeleton() {
	return (
		<div
			className="h-full rounded-lg border bg-card p-4 shadow-sm"
			role="presentation"
			data-testid="collection-rate-kpi-loading"
		>
			<div className="grid gap-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-9 w-20" />
				<Skeleton className="h-3 w-44" />
			</div>
		</div>
	);
}

export function CollectionRateKpi() {
	const { data, isPending, isError } = useCollectionRate();

	if (isPending) return <CollectionRateSkeleton />;

	if (isError || !data) {
		return (
			<Stat className="h-full" data-testid="collection-rate-kpi">
				<StatLabel>Collection rate</StatLabel>
				<StatValue className="text-base text-muted-foreground">
					Unavailable
				</StatValue>
				<StatDescription>
					Couldn&apos;t load the collection rate.
				</StatDescription>
			</Stat>
		);
	}

	// D-08: nothing scheduled means an honest 0%, not a hidden or invented tile.
	const hasLedgerData = data.scheduled > 0;
	const rate = hasLedgerData ? data.rate : 0;

	// Status/colour come from the shared helper; with no ledger data there is no
	// performance to grade, so the tile stays neutral instead of scoring a
	// "Poor" red arrow at an owner who simply has not started tracking yet.
	const status = hasLedgerData ? getCollectionRateStatus(rate) : null;
	const StatusIcon = status
		? (STATUS_ICONS[status.status] ?? TrendingDown)
		: CircleDashed;
	// Vivid token on an ICON glyph only — text keeps AA-safe tokens.
	const iconColor = status?.color ?? "text-muted-foreground";

	return (
		<Stat
			className="h-full transition-colors duration-200"
			data-testid="collection-rate-kpi"
			aria-label={
				status
					? `Collection rate: ${formatPercentage(rate)}. ${status.status}. Collected divided by scheduled, this month.`
					: `Collection rate: ${formatPercentage(rate)}. No rent tracked yet.`
			}
		>
			<StatLabel>Collection rate</StatLabel>
			<StatValue>
				<CollectionRateValue rate={rate} />
			</StatValue>
			<StatIndicator variant="icon">
				<StatusIcon aria-hidden="true" className={iconColor} />
			</StatIndicator>
			<StatDescription>
				{hasLedgerData
					? "Collected ÷ scheduled, this month"
					: "Start tracking rent to see your collection rate"}
			</StatDescription>
		</Stat>
	);
}
