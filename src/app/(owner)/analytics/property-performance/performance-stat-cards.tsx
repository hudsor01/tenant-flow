import { Building2, DollarSign, Home, TrendingUp } from "lucide-react";
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
import { formatDateWindow } from "#lib/formatters/date";
import { formatNumber } from "#lib/utils/currency";
import type { PropertyPerformanceSummary } from "#types/analytics";

interface PerformanceStatCardsProps {
	metrics: PropertyPerformanceSummary;
}

export function PerformanceStatCards({ metrics }: PerformanceStatCardsProps) {
	// Each wrapper fills its grid cell and each tile its wrapper, rows held to
	// the top; below lg every label keeps two lines' height, so at 390, where
	// "Best performer" wraps beside "Rent received", the two figures share a
	// line (66.2-39 part Q).
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<BlurFade delay={0.2} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<BorderBeam
						size={100}
						duration={10}
						colorFrom="var(--color-primary)"
						colorTo="oklch(from var(--color-primary) l c h / 0.3)"
					/>
					<StatLabel className="min-h-10 lg:min-h-0">
						Total properties
					</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={metrics.totalProperties} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Building2 />
					</StatIndicator>
					<StatDescription>Tracked in workspace</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="var(--color-success)"
						colorTo="oklch(from var(--color-success) l c h / 0.3)"
					/>
					<StatLabel className="min-h-10 lg:min-h-0">
						Average occupancy
					</StatLabel>
					<StatValue className="flex items-baseline gap-0.5 text-success-text">
						<NumberTicker
							value={metrics.averageOccupancy}
							duration={1500}
							decimalPlaces={1}
						/>
						<span className="text-lg">%</span>
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<TrendingUp />
					</StatIndicator>
					<StatTrend trend="neutral">
						<span className="text-muted-foreground">
							{formatNumber(metrics.occupiedUnits)} of{" "}
							{formatNumber(metrics.totalUnits)} occupied
						</span>
					</StatTrend>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<StatLabel className="min-h-10 lg:min-h-0">Best performer</StatLabel>
					<StatValue className="flex items-baseline text-base font-semibold truncate">
						{metrics.bestPerformer ?? "-"}
					</StatValue>
					<StatIndicator variant="icon" color="info">
						<Home />
					</StatIndicator>
					<StatDescription>Highest occupancy rate</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.5} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<StatLabel className="min-h-10 lg:min-h-0">Rent received</StatLabel>
					{metrics.rentReceived === null ? (
						<StatValue className="flex items-baseline text-base font-semibold text-muted-foreground">
							Unavailable
						</StatValue>
					) : (
						<StatValue className="flex items-baseline gap-0.5">
							<NumberTicker
								value={metrics.rentReceived}
								duration={1500}
								currency
								symbolClassName="text-lg mr-0.5"
							/>
						</StatValue>
					)}
					<StatIndicator variant="icon" color="success">
						<DollarSign />
					</StatIndicator>
					<StatDescription>
						{metrics.rentReceivedWindow
							? formatDateWindow(metrics.rentReceivedWindow)
							: metrics.rentReceived === null
								? "Ledger totals pending"
								: "Last 30 days"}
					</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	);
}
