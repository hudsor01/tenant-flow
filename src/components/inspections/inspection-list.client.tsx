"use client";

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { Skeleton } from "#components/ui/skeleton";
import { useInspections } from "#hooks/api/use-inspections";
import { assertNever } from "#lib/assert-never";
import { formatDate } from "#lib/formatters/date";
import type {
	InspectionListItem,
	InspectionStatus,
} from "#types/sections/inspections";
import { INSPECTION_STATUS_LABELS } from "./inspection-labels";

function statusBadgeVariant(
	status: InspectionStatus,
): "default" | "secondary" | "outline" {
	switch (status) {
		case "pending":
			return "secondary";
		case "in_progress":
			return "default";
		case "completed":
			return "outline";
		case "tenant_reviewing":
			return "secondary";
		case "finalized":
			return "outline";
		default:
			return assertNever(status, "statusBadgeVariant");
	}
}

function InspectionRow({ inspection }: { inspection: InspectionListItem }) {
	const typeLabel =
		inspection.inspection_type === "move_in" ? "Move-In" : "Move-Out";

	return (
		<Link
			href={`/inspections/${inspection.id}`}
			className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/40 transition-colors"
		>
			<div className="flex flex-col gap-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-medium text-sm truncate">
						{inspection.property_name}
					</span>
					{inspection.unit_name && (
						<span className="text-muted-foreground text-sm">
							· Unit {inspection.unit_name}
						</span>
					)}
				</div>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>{typeLabel}</span>
					<span>·</span>
					<span>
						{inspection.room_count} room{inspection.room_count !== 1 ? "s" : ""}
					</span>
					{inspection.scheduled_date && (
						<>
							<span>·</span>
							<span>Scheduled {formatDate(inspection.scheduled_date)}</span>
						</>
					)}
				</div>
			</div>
			<div className="flex items-center gap-3 ml-4 shrink-0">
				<span className="text-xs text-muted-foreground hidden sm:block">
					{formatDate(inspection.created_at, { relative: true })}
				</span>
				<Badge variant={statusBadgeVariant(inspection.status)}>
					{INSPECTION_STATUS_LABELS[inspection.status]}
				</Badge>
			</div>
		</Link>
	);
}

export function InspectionListClient() {
	const { data: inspections, isLoading, error } = useInspections();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">
						Inspections
					</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Move-in and move-out inspection reports
					</p>
				</div>
				<Link href="/inspections/new">
					<Button className="shrink-0">
						<Plus className="w-4 h-4 mr-2" aria-hidden="true" />
						New Inspection
					</Button>
				</Link>
			</div>

			{/* Content */}
			<div className="rounded-lg border bg-card">
				{isLoading && (
					<div className="divide-y">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="p-4 flex items-center justify-between">
								<div className="space-y-2">
									<Skeleton className="h-4 w-48" />
									<Skeleton className="h-3 w-32" />
								</div>
								<Skeleton className="h-6 w-20" />
							</div>
						))}
					</div>
				)}

				{error && (
					<div className="p-8 text-center">
						<p className="text-sm text-destructive-text">
							Failed to load inspections. Please try again.
						</p>
					</div>
				)}

				{!isLoading && !error && (!inspections || inspections.length === 0) && (
					<Empty>
						<EmptyMedia className="bg-primary/10 text-primary size-16 rounded-sm mb-6 [&_svg]:size-8">
							<ClipboardList aria-hidden="true" />
						</EmptyMedia>
						<EmptyHeader>
							<EmptyTitle>No inspections yet</EmptyTitle>
							<EmptyDescription>
								Create a move-in or move-out inspection for your properties.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button size="sm" asChild>
								<Link href="/inspections/new">
									<Plus className="w-4 h-4 mr-2" aria-hidden="true" />
									New Inspection
								</Link>
							</Button>
						</EmptyContent>
					</Empty>
				)}

				{!isLoading && !error && inspections && inspections.length > 0 && (
					<div>
						{inspections.map((inspection) => (
							<InspectionRow key={inspection.id} inspection={inspection} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
