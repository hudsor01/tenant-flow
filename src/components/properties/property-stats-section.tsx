import { Building2, DollarSign, Home, Users } from "lucide-react";
import { formatCurrency } from "#lib/utils/currency";
import type { PropertiesSummary } from "./types";

interface PropertyStatsSectionProps {
	summary: PropertiesSummary;
}

export function PropertyStatsSection({ summary }: PropertyStatsSectionProps) {
	return (
		<section className="@container/property-stats mb-8">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Overview
				</h2>
			</div>
			{/* Each icon sits beside its label, so a figure has the tile's whole
			    width, and the columns step on the row's own width (the rail
			    changes it), never the viewport's: one column until a tile can
			    hold $1,234,567.00 (156.53px) in two, four from where it can in
			    four (66.2-39 fix round 4, Part 8c, VD-171). No label wraps at any
			    of these widths, so none reserves a second line. */}
			<div className="grid grid-cols-1 @min-[25rem]/property-stats:grid-cols-2 @min-[51rem]/property-stats:grid-cols-4 gap-4">
				{/* Total Properties */}
				<div className="bg-card border border-border rounded-sm p-4">
					<div className="flex items-center justify-between gap-2 mb-2">
						<p className="mb-0 text-sm text-muted-foreground">Properties</p>
						<div className="w-9 h-9 shrink-0 rounded-sm bg-primary/10 flex items-center justify-center">
							<Building2 className="w-4 h-4 text-primary" />
						</div>
					</div>
					<p className="mb-0 whitespace-nowrap text-2xl font-bold text-foreground">
						{summary.totalProperties}
					</p>
				</div>

				{/* Occupancy Rate */}
				<div className="bg-card border border-border rounded-sm p-4">
					<div className="flex items-center justify-between gap-2 mb-2">
						<p className="mb-0 text-sm text-muted-foreground">Occupancy</p>
						<div className="w-9 h-9 shrink-0 rounded-sm bg-primary/10 flex items-center justify-center">
							<Users className="w-4 h-4 text-primary" />
						</div>
					</div>
					<p className="mb-0 whitespace-nowrap text-2xl font-bold text-foreground">
						{summary.overallOccupancyRate}%
					</p>
				</div>

				{/* Available Units */}
				<div className="bg-card border border-border rounded-sm p-4">
					<div className="flex items-center justify-between gap-2 mb-2">
						<p className="mb-0 text-sm text-muted-foreground">Available</p>
						<div className="w-9 h-9 shrink-0 rounded-sm bg-primary/10 flex items-center justify-center">
							<Home className="w-4 h-4 text-primary" />
						</div>
					</div>
					<p className="mb-0 whitespace-nowrap text-2xl font-bold text-foreground">
						{summary.availableUnits}
					</p>
				</div>

				{/* The occupied units' rent as listed on each unit, monthly: no lease
				    is read here, so it is neither scheduled nor received rent. */}
				<div className="bg-card border border-border rounded-sm p-4">
					<div className="flex items-center justify-between gap-2 mb-2">
						<p className="mb-0 text-sm text-muted-foreground">Occupied Rent</p>
						<div className="w-9 h-9 shrink-0 rounded-sm bg-success/10 flex items-center justify-center">
							<DollarSign className="w-4 h-4 text-success-text" />
						</div>
					</div>
					{/* The sub-line follows the figure: beside it, in one bottom-aligned
					    row, it lifted this figure 4px above the other three (VD-171). */}
					<p className="mb-0 whitespace-nowrap text-2xl font-bold text-foreground">
						{formatCurrency(summary.totalMonthlyRevenue)}
					</p>
					{summary.totalUnits > 0 && (
						<p className="mb-0 text-xs text-muted-foreground">
							{formatCurrency(
								Math.round(summary.totalMonthlyRevenue / summary.totalUnits),
							)}
							/unit avg
						</p>
					)}
				</div>
			</div>
		</section>
	);
}
