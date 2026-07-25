"use client";

/**
 * Financial-overview stat cards.
 *
 * D-07 (load-bearing): the lease-derived figure is labeled **Scheduled** and the
 * ledger-derived figure is labeled **Collected**. They are two explicitly
 * labeled, tooltipped numbers with different meanings — they are NEVER summed
 * into a single "Revenue" figure, and Net Income / Portfolio ROI / Cash Flow
 * still derive from Scheduled minus expenses exactly as before. Re-basing profit
 * on Collected would silently change what those three cards mean.
 */

import {
	BarChart3,
	DollarSign,
	Info,
	ReceiptText,
	TrendingUp,
} from "lucide-react";
import { AnimatedTrendIndicator } from "#components/ui/animated-trend-indicator";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import { NumberTicker } from "#components/ui/number-ticker";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatTrend,
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
		<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={10}
						colorFrom="var(--color-success)"
						colorTo="oklch(from var(--color-success) l c h / 0.3)"
					/>
					<LabelWithTooltip
						label="Scheduled"
						help="Rent expected from active lease terms this period."
					/>
					<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
						<span className="text-lg">$</span>
						<NumberTicker value={metrics.totalRevenue} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<DollarSign />
					</StatIndicator>
					<StatTrend
						trend={
							metrics.revenueTrend && metrics.revenueTrend >= 0 ? "up" : "down"
						}
					>
						<AnimatedTrendIndicator
							value={metrics.revenueTrend ?? 0}
							size="sm"
							delay={500}
						/>
						<span className="text-muted-foreground">vs last period</span>
					</StatTrend>
					<StatDescription>Annualized from active leases</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.25} inView>
				<Stat className="relative overflow-hidden">
					<LabelWithTooltip
						label="Collected"
						help="Payments you've recorded against charges this period."
					/>
					<StatValue className="flex items-baseline gap-0.5">
						<span className="text-lg">$</span>
						<NumberTicker value={metrics.totalCollected} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="info">
						<ReceiptText />
					</StatIndicator>
					<StatDescription>
						Receipts recorded in your rent ledger, last 12 months
					</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Net Income</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<span className="text-lg">$</span>
						<NumberTicker value={metrics.netIncome} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<TrendingUp />
					</StatIndicator>
					<StatTrend
						trend={
							metrics.profitMargin && metrics.profitMargin >= 0 ? "up" : "down"
						}
					>
						<AnimatedTrendIndicator
							value={metrics.profitMargin ?? 0}
							size="sm"
							delay={600}
						/>
						<span className="text-muted-foreground">profit margin</span>
					</StatTrend>
					<StatDescription>Scheduled minus expenses</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Portfolio ROI</StatLabel>
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
					<StatTrend
						trend={
							metrics.expenseTrend && metrics.expenseTrend >= 0 ? "up" : "down"
						}
					>
						<AnimatedTrendIndicator
							value={metrics.expenseTrend ?? 0}
							size="sm"
							delay={700}
						/>
						<span className="text-muted-foreground">expense trend</span>
					</StatTrend>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.5} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Cash Flow</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<span className="text-lg">$</span>
						<NumberTicker value={metrics.cashFlow} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<DollarSign />
					</StatIndicator>
					<StatTrend
						trend={
							metrics.revenueTrend && metrics.revenueTrend >= 0 ? "up" : "down"
						}
					>
						<AnimatedTrendIndicator
							value={metrics.revenueTrend ?? 0}
							size="sm"
							delay={800}
						/>
						<span className="text-muted-foreground">operating cash</span>
					</StatTrend>
				</Stat>
			</BlurFade>
		</div>
	);
}
