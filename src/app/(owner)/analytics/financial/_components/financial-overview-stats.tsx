"use client";

/**
 * Financial-overview stat cards.
 *
 * D-07 (load-bearing): the lease-derived figure is labeled **Scheduled** and the
 * ledger-derived figure is labeled **Collected**. They are two explicitly
 * labeled, tooltipped numbers with different meanings — they are NEVER summed
 * into a single "Revenue" figure. Scheduled Net and Scheduled Margin derive from
 * Scheduled minus expenses, and say so (get_financial_overview's revenue is
 * the active leases' rent times twelve: neither income nor cash). There is no
 * Cash Flow card: it showed Scheduled Net again under a cash label. No card has
 * a trend chip: the RPC computes no prior-period figure, and the chips read
 * fields nothing ever filled ("0.0% vs last period").
 */

import {
	BarChart3,
	DollarSign,
	Info,
	ReceiptText,
	TrendingUp,
} from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import { NumberTicker } from "#components/ui/number-ticker";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatValue,
} from "#components/ui/stat";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#components/ui/tooltip";
import type { FinancialMetricSummary } from "#types/analytics";

interface FinancialOverviewStatsProps {
	metrics: FinancialMetricSummary;
}

/** A stat label whose meaning is spelled out in a keyboard-reachable tooltip. */
function LabelWithTooltip({ label, help }: { label: string; help: string }) {
	return (
		<StatLabel>
			<Tooltip>
				<TooltipTrigger
					type="button"
					className="inline-flex items-center gap-1 rounded-sm underline decoration-dotted underline-offset-4"
				>
					{label}
					<Info aria-hidden="true" className="size-3" />
				</TooltipTrigger>
				<TooltipContent className="max-w-64">{help}</TooltipContent>
			</Tooltip>
		</StatLabel>
	);
}

export function FinancialOverviewStats({
	metrics,
}: FinancialOverviewStatsProps) {
	return (
		<div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
			<BlurFade delay={0.2} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<BorderBeam
						size={100}
						duration={10}
						colorFrom="var(--color-success)"
						colorTo="oklch(from var(--color-success) l c h / 0.3)"
					/>
					<LabelWithTooltip
						label="Scheduled"
						help="Your active leases' monthly rent times twelve: rent expected, not received."
					/>
					<StatValue className="flex items-baseline gap-0.5 text-success-text">
						<NumberTicker
							value={metrics.totalRevenue}
							duration={1500}
							currency
							symbolClassName="text-lg mr-0.5"
						/>
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<DollarSign />
					</StatIndicator>
					<StatDescription>Annualized from active leases</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.25} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<LabelWithTooltip
						label="Collected"
						help="Payments recorded in your rent ledger over the last 12 months, this month included."
					/>
					<StatValue className="flex items-baseline gap-0.5">
						<NumberTicker
							value={metrics.totalCollected}
							duration={1500}
							currency
							symbolClassName="text-lg mr-0.5"
						/>
					</StatValue>
					<StatIndicator variant="icon" color="info">
						<ReceiptText />
					</StatIndicator>
					<StatDescription>
						Receipts recorded in your rent ledger, last 12 months
					</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<StatLabel>Scheduled Net</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<NumberTicker
							value={metrics.netIncome}
							duration={1500}
							currency
							symbolClassName="text-lg mr-0.5"
						/>
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<TrendingUp />
					</StatIndicator>
					{/* get_financial_overview's expenses run January 1 through today
					    (its default period); its scheduled figure is a year's rent. */}
					<StatDescription>
						Scheduled less expenses, year to date
					</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<StatLabel>Scheduled Margin</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<NumberTicker
							value={metrics.profitMargin ?? 0}
							duration={1500}
							decimalPlaces={1}
						/>
						<span className="text-lg">%</span>
					</StatValue>
					<StatIndicator variant="icon" color="info">
						<BarChart3 />
					</StatIndicator>
					<StatDescription>Scheduled net over scheduled</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	);
}
