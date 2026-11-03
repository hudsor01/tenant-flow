import { OccupancyBadge } from "#components/dashboard/components/occupancy-badge";
import { formatCurrency } from "#lib/utils/currency";
import type { PortfolioRow } from "../dashboard-types";

interface PortfolioGridProps {
	data: PortfolioRow[];
}

export function PortfolioGrid({ data }: PortfolioGridProps) {
	return (
		<div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{data.map((row) => (
				<div key={row.id} className="border border-border rounded-lg p-4">
					<div className="flex items-start justify-between mb-3">
						<div>
							<div className="font-medium">{row.property}</div>
							<div className="text-xs text-muted-foreground">{row.address}</div>
						</div>
						<OccupancyBadge occupancy={row.occupancy} />
					</div>
					<div className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<div className="text-muted-foreground text-xs">Units</div>
							<div className="tabular-nums">
								{row.units.occupied}/{row.units.total}
							</div>
						</div>
						<div>
							<div className="text-muted-foreground text-xs">Rent</div>
							<div className="tabular-nums">
								{formatCurrency(row.rent, {
									minimumFractionDigits: 0,
									maximumFractionDigits: 0,
								})}
							</div>
						</div>
						<div>
							<div className="text-muted-foreground text-xs">Tenants</div>
							<div>
								{row.tenant ?? (
									<span className="text-muted-foreground">
										<span aria-hidden="true">--</span>
										<span className="sr-only">No tenants</span>
									</span>
								)}
							</div>
						</div>
						<div>
							<div className="text-muted-foreground text-xs">Maintenance</div>
							<div
								className={
									row.maintenanceOpen > 0 ? "text-destructive-text" : ""
								}
							>
								{row.maintenanceOpen > 0 ? (
									`${row.maintenanceOpen} open`
								) : (
									<span className="text-muted-foreground">
										<span aria-hidden="true">--</span>
										<span className="sr-only">No open requests</span>
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
