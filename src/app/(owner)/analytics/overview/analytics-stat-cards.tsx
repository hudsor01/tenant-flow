import {
	ArrowDownRight,
	ArrowUpRight,
	Building2,
	DollarSign,
	Minus,
	Users,
	Wrench,
} from "lucide-react";
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
import { windowDays } from "#lib/stated-window";
import type { DateWindow, PortfolioTrends } from "#types/analytics";

/**
 * The overview's four headline figures. Occupancy and revenue carry the change
 * get_dashboard_data_v2 computes over the window it states (20261102184501):
 * occupancy in percentage points, scheduled rent in percent. Before that
 * migration the server states no window and its figure is no change (a
 * literal 0, or a comparison against only the leases still active today), so
 * the tile says the change is unavailable.
 */
interface AnalyticsStatCardsProps {
	occupancyRate: number;
	activeTenants: number;
	monthlyRevenue: number;
	/** Scheduled rent less expenses over scheduled rent (get_financial_overview). */
	scheduledMargin: number;
	openMaintenance: number;
	maintenanceChange: number;
	/** Undefined while the dashboard payload loads. */
	trends: PortfolioTrends | undefined;
}

/** The U+2212 typographic minus the dashboard's trend chips use. */
const MINUS = String.fromCharCode(0x2212);

/** A signed figure to one decimal: "+1.5", "−25.0", "0.0". */
function signed(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	const sign = rounded > 0 ? "+" : rounded < 0 ? MINUS : "";
	return `${sign}${Math.abs(rounded).toFixed(1)}`;
}

/** "vs 30 days ago": the window's first day, counted back from its last. */
function since(window: DateWindow): string {
	return `vs ${windowDays(window)} days ago`;
}

/** A change's line: its direction, its figure and the day it compares with. */
function ChangeLine({
	value,
	unit,
	window,
}: {
	value: number;
	unit: string;
	window: DateWindow;
}) {
	const rounded = Math.round(value * 10) / 10;
	const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "neutral";
	const Icon =
		rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
	return (
		<StatTrend trend={direction}>
			<Icon aria-hidden="true" />
			<span>
				{signed(value)}
				{unit}
			</span>
			<span className="text-muted-foreground">{since(window)}</span>
		</StatTrend>
	);
}

/** A line with no figure: the change is unavailable, or has no prior figure. */
function NoChangeLine({ children }: { children: string }) {
	return (
		<StatTrend trend="neutral">
			<span className="text-muted-foreground">{children}</span>
		</StatTrend>
	);
}

function OccupancyChange({ trends }: { trends: PortfolioTrends | undefined }) {
	if (!trends) return null;
	const { occupancy } = trends;
	if (occupancy.status === "unavailable") {
		return <NoChangeLine>Change unavailable</NoChangeLine>;
	}
	return (
		<ChangeLine
			value={occupancy.points}
			unit=" pts"
			window={occupancy.window}
		/>
	);
}

function RevenueChange({ trends }: { trends: PortfolioTrends | undefined }) {
	if (!trends) return null;
	const { revenue } = trends;
	if (revenue.status === "unavailable") {
		return <NoChangeLine>Change unavailable</NoChangeLine>;
	}
	if (revenue.percent === null) {
		return (
			<NoChangeLine>{`No rent scheduled ${windowDays(revenue.window)} days ago`}</NoChangeLine>
		);
	}
	return (
		<ChangeLine value={revenue.percent} unit="%" window={revenue.window} />
	);
}

export function AnalyticsStatCards({
	occupancyRate,
	activeTenants,
	monthlyRevenue,
	scheduledMargin,
	openMaintenance,
	maintenanceChange,
	trends,
}: AnalyticsStatCardsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<BlurFade delay={0.2}>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={10}
						colorFrom="var(--color-primary)"
						colorTo="oklch(from var(--color-primary) l c h / 0.3)"
					/>
					<StatLabel>Occupancy Rate</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<NumberTicker
							value={occupancyRate}
							duration={1500}
							decimalPlaces={1}
						/>
						<span className="text-lg">%</span>
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Building2 />
					</StatIndicator>
					<OccupancyChange trends={trends} />
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3}>
				<Stat className="relative overflow-hidden">
					<StatLabel>Active Tenants</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={activeTenants} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<Users />
					</StatIndicator>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4}>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="var(--color-success)"
						colorTo="oklch(from var(--color-success) l c h / 0.3)"
					/>
					<StatLabel>Monthly Revenue</StatLabel>
					<StatValue className="flex items-baseline gap-0.5 text-success-text">
						<NumberTicker
							value={monthlyRevenue}
							duration={1500}
							currency
							symbolClassName="text-lg mr-0.5"
						/>
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<DollarSign />
					</StatIndicator>
					<RevenueChange trends={trends} />
					{scheduledMargin > 0 && (
						<StatDescription>
							{scheduledMargin.toFixed(1)}% scheduled margin
						</StatDescription>
					)}
				</Stat>
			</BlurFade>

			<BlurFade delay={0.5}>
				<Stat className="relative overflow-hidden">
					{openMaintenance > 3 && (
						<BorderBeam
							size={80}
							duration={6}
							colorFrom="var(--color-warning)"
							colorTo="oklch(from var(--color-warning) l c h / 0.3)"
						/>
					)}
					<StatLabel>Open Maintenance</StatLabel>
					<StatValue className="flex items-baseline text-warning-text">
						<NumberTicker value={openMaintenance} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Wrench />
					</StatIndicator>
					<StatDescription>
						{maintenanceChange < 0 ? (
							<span className="text-success-text">
								{maintenanceChange} from last week
							</span>
						) : (
							<span className="text-warning-text">
								+{maintenanceChange} from last week
							</span>
						)}
					</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	);
}
