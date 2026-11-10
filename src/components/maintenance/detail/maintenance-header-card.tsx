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
			{/* The title and its actions share one row that wraps: the header
			    primitive is a grid, so this header's `flex-row justify-between`
			    did nothing, the actions sat on their own row, and that row's
			    max-content (299.91px: the status select, Edit and Export) sized
			    the grid's only column past the card at 320-336px (the page 341px
			    wide). The title takes the row's free space from 16rem; below
			    that the actions wrap under it, and wrap themselves (66.2-39 fix
			    round 4, Part 8e). */}
			<CardHeader className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0 flex-1 basis-64 space-y-2">
					<CardTitle className="flex items-center gap-2 text-xl">
						<Wrench className="size-5 shrink-0 text-primary" />
						<span className="min-w-0 wrap-break-word">
							{request.title ?? request.description ?? "Maintenance Request"}
						</span>
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
				<div className="flex flex-wrap items-center gap-2">
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
			<CardContent className="@container/maintenance-header space-y-6">
				{/* Description */}
				<section className="space-y-2">
					<h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
						Description
					</h2>
					<p className="text-sm leading-relaxed">
						{request.description || "No description provided."}
					</p>
				</section>

				{/* Location & Schedule. mb-0 on every line in these boxes and the
				    cost boxes below: the base `p` margin stood 16px between the
				    property and its unit and 16px under each box's last line,
				    inside its p-4. These boxes and the cost boxes step on the
				    card's own width, never the viewport's (the page's columns and
				    the rail set it), at one width, so the two rows always have the
				    same columns: two once two boxes are 16.5rem wide, where the
				    Scheduled Date label and its Schedule button (227.81px) share a
				    line and each cost box holds $1,234,567.89 (115.38px) (66.2-39
				    fix round 4, Part 8d). */}
				<section className="grid grid-cols-1 gap-4 @min-[34rem]/maintenance-header:grid-cols-2">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<MapPin className="size-4 shrink-0" />
							Location
						</div>
						<p className="mt-1 mb-0 font-medium">
							{request.propertyName ?? "Unknown Property"}
						</p>
						{request.unitNumber && (
							<p className="mb-0 text-sm text-muted-foreground">
								Unit {request.unitNumber}
							</p>
						)}
					</div>

					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Calendar className="size-4 shrink-0" />
								Scheduled Date
							</div>
							<ScheduleDialog
								maintenanceId={request.id}
								currentDate={request.scheduled_date}
								onSuccess={onRefresh}
							/>
						</div>
						<p className="mt-1 mb-0 font-medium">
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
				<section className="grid grid-cols-1 gap-4 @min-[34rem]/maintenance-header:grid-cols-2">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<DollarSign className="size-4 shrink-0" />
							Estimated Cost
						</div>
						<p className="mt-1 mb-0 whitespace-nowrap font-medium text-lg">
							{request.estimated_cost
								? formatCurrency(request.estimated_cost)
								: "-"}
						</p>
					</div>
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<DollarSign className="size-4 shrink-0" />
							Spent to Date
						</div>
						<p className="mt-1 mb-0 whitespace-nowrap font-medium text-lg">
							{spentToDate > 0 ? formatCurrency(spentToDate) : "-"}
						</p>
					</div>
				</section>
			</CardContent>
		</Card>
	);
}
