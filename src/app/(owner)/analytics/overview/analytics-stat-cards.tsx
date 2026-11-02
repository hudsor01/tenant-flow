import { Building2, DollarSign, Users, Wrench } from "lucide-react";
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

/**
 * The overview's four headline figures. There is no period-over-period trend
 * on occupancy, tenants or revenue: get_dashboard_stats returns occupancyChange
 * and revenue.growth as the literal 0, so the trends these cards showed ("0% vs
 * last period", "+0 this month", "0% growth") were never figures. Open
 * maintenance keeps its week-over-week change, which get_dashboard_data_v2
 * computes.
 */
interface AnalyticsStatCardsProps {
	occupancyRate: number;
	activeTenants: number;
	monthlyRevenue: number;
	avgRoi: number;
	openMaintenance: number;
	maintenanceChange: number;
}

export function AnalyticsStatCards({
	occupancyRate,
	activeTenants,
	monthlyRevenue,
	avgRoi,
	openMaintenance,
	maintenanceChange,
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
					{avgRoi > 0 && (
						<StatDescription>{avgRoi.toFixed(1)}% ROI</StatDescription>
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
