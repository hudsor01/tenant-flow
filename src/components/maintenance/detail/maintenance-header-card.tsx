"use client";

import {
	Calendar,
	DollarSign,
	Download,
	Edit2,
	MapPin,
	Wrench,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#components/ui/card";
import type { MaintenanceDetailRow } from "#hooks/api/query-keys/maintenance-mappers";
import { formatDate } from "#lib/formatters/date";
import { formatCurrency } from "#lib/utils/currency";
import type { MaintenancePriority, MaintenanceStatus } from "#types/core";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "./maintenance-utils";
import { ScheduleDialog } from "./schedule-dialog";
import { StatusSelect } from "./status-select";

type MaintenanceHeaderRequest = Pick<
	MaintenanceDetailRow,
	| "id"
	| "title"
	| "description"
	| "status"
	| "priority"
	| "scheduled_date"
	| "estimated_cost"
	| "propertyName"
	| "unitNumber"
>;

interface MaintenanceHeaderCardProps {
	request: MaintenanceHeaderRequest;
	/**
	 * The request's spend to date: its expenses (not soft-deleted) dated
	 * through today, as get_maintenance_analytics counts total_cost
	 * (20261102184503). `actual_cost` is shown nowhere: nothing writes it.
	 */
	spentToDate: number;
	onRefresh: () => void;
	onExport: () => void;
}

export function MaintenanceHeaderCard({
	request,
	spentToDate,
	onRefresh,
	onExport,
}: MaintenanceHeaderCardProps) {
	const statusConfig =
		STATUS_CONFIG[request.status as MaintenanceStatus] ?? STATUS_CONFIG.open;
	const priorityConfig =
		PRIORITY_CONFIG[request.priority as MaintenancePriority] ??
		PRIORITY_CONFIG.normal;

	return (
		<Card>
			<CardHeader className="flex-row items-start justify-between gap-4">
				<div className="space-y-2">
					<CardTitle className="flex items-center gap-2 text-xl">
						<Wrench className="size-5 text-primary" />
						{request.title ?? request.description ?? "Maintenance Request"}
					</CardTitle>
					<div className="flex flex-wrap gap-2">
						<Badge className={`${statusConfig.className} gap-1`}>
							{statusConfig.icon}
							{statusConfig.label}
						</Badge>
						<Badge className={priorityConfig.className}>
							{priorityConfig.label} Priority
						</Badge>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<StatusSelect
						currentStatus={request.status as MaintenanceStatus}
						maintenanceId={request.id}
						onSuccess={onRefresh}
					/>
					<Button asChild variant="outline" size="sm">
						<Link href={`/maintenance/${request.id}/edit`}>
							<Edit2 className="size-4 mr-1.5" />
							Edit
						</Link>
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onExport}
						aria-label="Export request"
					>
						<Download className="size-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Description */}
				<section className="space-y-2">
					<h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
						Description
					</h2>
					<p className="text-sm leading-relaxed">
						{request.description || "No description provided."}
					</p>
				</section>

				{/* Location & Schedule */}
				<section className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<MapPin className="size-4" />
							Location
						</div>
						<p className="mt-1 font-medium">
							{request.propertyName ?? "Unknown Property"}
						</p>
						{request.unitNumber && (
							<p className="text-sm text-muted-foreground">
								Unit {request.unitNumber}
							</p>
						)}
					</div>

					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Calendar className="size-4" />
								Scheduled Date
							</div>
							<ScheduleDialog
								maintenanceId={request.id}
								currentDate={request.scheduled_date}
								onSuccess={onRefresh}
							/>
						</div>
						<p className="mt-1 font-medium">
							{request.scheduled_date
								? formatDate(request.scheduled_date, {
										formatOptions: {
											weekday: "long",
											year: "numeric",
											month: "long",
											day: "numeric",
											timeZone: "UTC",
										},
									})
								: "Not scheduled"}
						</p>
					</div>
				</section>

				{/* Cost Summary */}
				<section className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<DollarSign className="size-4" />
							Estimated Cost
						</div>
						<p className="mt-1 font-medium text-lg">
							{request.estimated_cost
								? formatCurrency(request.estimated_cost)
								: "-"}
						</p>
					</div>
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<DollarSign className="size-4" />
							Spent to Date
						</div>
						<p className="mt-1 font-medium text-lg">
							{spentToDate > 0 ? formatCurrency(spentToDate) : "-"}
						</p>
					</div>
				</section>
			</CardContent>
		</Card>
	);
}
