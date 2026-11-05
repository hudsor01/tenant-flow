import { Building, Calendar, User } from "lucide-react";
import { Card, CardContent } from "#components/ui/card";
import { formatCount } from "#lib/formatters/count";
import { formatDate } from "#lib/formatters/date";
import { cn } from "#lib/utils";
import type { Lease } from "#types/core";
import { getDaysUntilExpiry } from "./lease-detail-utils";

interface TenantInfo {
	email?: string | null | undefined;
	first_name?: string | null | undefined;
	last_name?: string | null | undefined;
	name?: string | null | undefined;
}

interface UnitInfo {
	unit_number?: string | null | undefined;
	bedrooms?: number | null | undefined;
	bathrooms?: number | null | undefined;
	square_feet?: number | null | undefined;
	property_id: string;
}

interface LeaseDetailsTabProps {
	lease: Lease;
	tenant: TenantInfo | null | undefined;
	unit: UnitInfo | null | undefined;
}

export function LeaseDetailsTab({ lease, tenant, unit }: LeaseDetailsTabProps) {
	const daysUntilExpiry = getDaysUntilExpiry(lease.end_date);
	const isExpiringSoon =
		daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

	const tenantFullName =
		tenant?.first_name || tenant?.last_name
			? `${tenant?.first_name ?? ""} ${tenant?.last_name ?? ""}`.trim()
			: tenant?.name;

	return (
		// The Card pads itself (py-6, CardContent px-6); a v3 p-6 here doubled
		// the top and bottom to 48px. mb-0 on every paragraph: each row's lines
		// sit in a flex item, where the base `p` margin stays inside it (16px
		// between the two lines and under them), and the last section's
		// paragraph would stand 16px above the card's own padding.
		<Card>
			<CardContent className="space-y-6">
				{/* Lease Period */}
				<section>
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
						Lease Period
					</h3>
					<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
						<Calendar className="w-8 h-8 text-primary" />
						<div>
							<p className="mb-0 font-medium">
								{formatDate(lease.start_date)} - {formatDate(lease.end_date)}
							</p>
							{daysUntilExpiry !== null && (
								<p
									className={cn(
										"mb-0 text-sm",
										isExpiringSoon
											? "text-warning-text"
											: "text-muted-foreground",
									)}
								>
									{daysUntilExpiry > 0
										? `${formatCount(daysUntilExpiry, "day")} remaining`
										: daysUntilExpiry === 0
											? "Expires today"
											: "Expired"}
								</p>
							)}
						</div>
					</div>
				</section>

				{/* Tenant Info */}
				<section>
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
						Tenant
					</h3>
					{tenant ? (
						<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
							<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
								<User className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="mb-0 font-medium">
									{tenantFullName || "Unknown"}
								</p>
								<p className="mb-0 text-sm text-muted-foreground">
									{tenant.email}
								</p>
							</div>
						</div>
					) : (
						<p className="mb-0 text-muted-foreground p-4 border rounded-lg bg-muted/10">
							No tenant assigned to this lease
						</p>
					)}
				</section>

				{/* Unit Info */}
				<section>
					<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
						Unit
					</h3>
					{unit ? (
						<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/20">
							<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
								<Building className="w-5 h-5 text-primary" />
							</div>
							<div>
								<p className="mb-0 font-medium">Unit {unit.unit_number}</p>
								<p className="mb-0 text-sm text-muted-foreground">
									{unit.bedrooms} bed, {unit.bathrooms} bath
									{unit.square_feet
										? ` | ${unit.square_feet.toLocaleString()} sq ft`
										: ""}
								</p>
							</div>
						</div>
					) : (
						<p className="mb-0 text-muted-foreground p-4 border rounded-lg bg-muted/10">
							No unit linked to this lease
						</p>
					)}
				</section>
			</CardContent>
		</Card>
	);
}
