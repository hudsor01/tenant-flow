import {
	ArrowDownRight,
	ArrowUpRight,
	Building2,
	DollarSign,
	Minus,
	Users,
	Wrench,
} from "lucide-react";
import { trendWindowLabel } from "#components/dashboard/components/kpi-helpers";
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
	formatSignedOneDecimal,
	TYPOGRAPHIC_MINUS,
} from "#lib/formatters/signed";
import { windowDays } from "#lib/stated-window";
import type {
	DateWindow,
	MetricTrend,
	PortfolioTrends,
} from "#types/analytics";

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
	/**
	 * get_dashboard_data_v2's open-maintenance trend: the requests open now
	 * against those open on its window's first day (30 days ago). Undefined
	 * while the payload loads, null when the payload carries none.
	 */
	maintenanceTrend: MetricTrend | null | undefined;
	/** Undefined while the dashboard payload loads. */
	trends: PortfolioTrends | undefined;
}

/** "vs. 30 days ago", as the dashboard's chips say it: the window's first day. */
function since(window: DateWindow): string {
	return trendWindowLabel(windowDays(window));
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
				{formatSignedOneDecimal(value)}
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

/**
 * The open-maintenance line: the change in open requests over the trend's own
 * window ("+2 vs. 30 days ago"). It said "from last week" over a 30-day
 * comparison. A count, so a whole number; more open is the warning colour.
 */
function MaintenanceChange({
	trend,
}: {
	trend: MetricTrend | null | undefined;
}) {
	if (!trend) return null;
	if (trend.window === null) {
		return (
			<StatDescription>
				<span className="text-muted-foreground">Change unavailable</span>
			</StatDescription>
		);
	}
	const change = Math.round(trend.change);
	const window = since(trend.window);
	if (change === 0) {
		return (
			<StatDescription>
				<span className="text-muted-foreground">{`Unchanged ${window}`}</span>
			</StatDescription>
		);
	}
	const figure =
		change > 0 ? `+${change}` : `${TYPOGRAPHIC_MINUS}${Math.abs(change)}`;
	return (
		<StatDescription>
			<span className={change < 0 ? "text-success-text" : "text-warning-text"}>
				{`${figure} ${window}`}
			</span>
		</StatDescription>
	);
}

export function AnalyticsStatCards({
	occupancyRate,
	activeTenants,
	monthlyRevenue,
	scheduledMargin,
	openMaintenance,
	maintenanceTrend,
	trends,
}: AnalyticsStatCardsProps) {
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

			<BlurFade delay={0.3} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<StatLabel>Active Tenants</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={activeTenants} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<Users />
					</StatIndicator>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="var(--color-success)"
						colorTo="oklch(from var(--color-success) l c h / 0.3)"
					/>
					<StatLabel>Scheduled Monthly Rent</StatLabel>
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

			<BlurFade delay={0.5} className="h-full">
				<Stat className="relative h-full content-start overflow-hidden">
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
					<MaintenanceChange trend={maintenanceTrend} />
				</Stat>
			</BlurFade>
		</div>
	);
}
