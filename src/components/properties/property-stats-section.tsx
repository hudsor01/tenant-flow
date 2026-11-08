import { Building2, DollarSign, Home, Users } from "lucide-react";
import { formatCurrency } from "#lib/utils/currency";
import type { PropertiesSummary } from "./types";

interface PropertyStatsSectionProps {
	summary: PropertiesSummary;
}

export function PropertyStatsSection({ summary }: PropertyStatsSectionProps) {
	return (
		<section className="mb-8">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Overview
				</h2>
			</div>
			{/* Below lg every label keeps two lines' height: at 390 "Occupied
			    Rent" wraps beside "Available", and the two figures share a line
			    (66.2-39 part Q). */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Total Properties */}
				<div className="bg-card border border-border rounded-sm p-4">
					<div className="flex items-center justify-between mb-2">
						<p className="mb-0 min-h-10 lg:min-h-0 text-sm text-muted-foreground">
							Properties
						</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="mb-0 text-2xl font-bold text-foreground">
							{summary.totalProperties}
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
							<Building2 className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>

				{/* Occupancy Rate */}
				<div className="bg-card border border-border rounded-sm p-4">
					<div className="flex items-center justify-between mb-2">
						<p className="mb-0 min-h-10 lg:min-h-0 text-sm text-muted-foreground">
							Occupancy
						</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="mb-0 text-2xl font-bold text-foreground">
							{summary.overallOccupancyRate}%
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
							<Users className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>

				{/* Available Units */}
				<div className="bg-card border border-border rounded-sm p-4">
					<div className="flex items-center justify-between mb-2">
						<p className="mb-0 min-h-10 lg:min-h-0 text-sm text-muted-foreground">
							Available
						</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="mb-0 text-2xl font-bold text-foreground">
							{summary.availableUnits}
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
							<Home className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>

				{/* The occupied units' rent as listed on each unit, monthly: no lease
				    is read here, so it is neither scheduled nor received rent. */}
				<div className="bg-card border border-border rounded-sm p-4">
					<div className="flex items-center justify-between mb-2">
						<p className="mb-0 min-h-10 lg:min-h-0 text-sm text-muted-foreground">
							Occupied Rent
						</p>
					</div>
					<div className="flex items-end justify-between">
						<div>
							<p className="mb-0 text-2xl font-bold text-foreground">
								{formatCurrency(summary.totalMonthlyRevenue)}
							</p>
							{summary.totalUnits > 0 && (
								<p className="mb-0 text-xs text-muted-foreground">
									{formatCurrency(
										Math.round(
											summary.totalMonthlyRevenue / summary.totalUnits,
										),
									)}
									/unit avg
								</p>
							)}
						</div>
						<div className="w-9 h-9 rounded-sm bg-success/10 flex items-center justify-center">
							<DollarSign className="w-4 h-4 text-success-text" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
