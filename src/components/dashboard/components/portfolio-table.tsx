"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#components/ui/table";
import { formatCurrency } from "#lib/utils/currency";
import type { PortfolioRow } from "../dashboard-types";

interface PortfolioTableProps {
	data: PortfolioRow[];
	sortField: string;
	sortDirection: "asc" | "desc";
	onSort: (field: string) => void;
}

function SortIndicator({
	field,
	sortField,
	sortDirection,
}: {
	field: string;
	sortField: string;
	sortDirection: "asc" | "desc";
}) {
	if (sortField !== field) return null;
	const Icon = sortDirection === "asc" ? ArrowUp : ArrowDown;
	return <Icon className="ml-1 inline-block size-4" aria-hidden="true" />;
}

type AriaSort = "ascending" | "descending" | "none";

function sortState(
	field: string,
	sortField: string,
	sortDirection: "asc" | "desc",
): AriaSort {
	if (sortField !== field) return "none";
	return sortDirection === "asc" ? "ascending" : "descending";
}

function SortableHead({
	field,
	label,
	sortField,
	sortDirection,
	onSort,
	align = "left",
	className,
}: {
	field: string;
	label: string;
	sortField: string;
	sortDirection: "asc" | "desc";
	onSort: (field: string) => void;
	align?: "left" | "right";
	className?: string;
}) {
	const justify = align === "right" ? "justify-end" : "justify-start";
	const headClass = [
		"cursor-pointer hover:bg-muted/50",
		align === "right" ? "text-right" : "",
		className ?? "",
	]
		.filter(Boolean)
		.join(" ");
	return (
		<TableHead
			className={headClass}
			aria-sort={sortState(field, sortField, sortDirection)}
		>
			<button
				type="button"
				onClick={() => onSort(field)}
				className={`inline-flex w-full items-center ${justify} font-inherit hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
			>
				{label}
				<SortIndicator
					field={field}
					sortField={sortField}
					sortDirection={sortDirection}
				/>
			</button>
		</TableHead>
	);
}

export function PortfolioTable({
	data,
	sortField,
	sortDirection,
	onSort,
}: PortfolioTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<SortableHead
						field="property"
						label="Property"
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={onSort}
					/>
					<SortableHead
						field="units"
						label="Units"
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={onSort}
					/>
					<TableHead>Tenants</TableHead>
					<SortableHead
						field="status"
						label="Lease Status"
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={onSort}
					/>
					<SortableHead
						field="rent"
						label="Monthly Rent"
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={onSort}
						align="right"
					/>
					<TableHead className="text-right">Maintenance</TableHead>
					<TableHead className="w-[100px]">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{data.map((row) => (
					<TableRow key={row.id} className="group">
						<TableCell>
							<div>
								<div className="font-medium">{row.property}</div>
								<div className="text-xs text-muted-foreground">
									{row.address}
								</div>
							</div>
						</TableCell>
						<TableCell>
							<span className="tabular-nums">
								{row.units.occupied}/{row.units.total}
							</span>
							<span className="ml-1 text-xs text-muted-foreground">
								occupied
							</span>
						</TableCell>
						<TableCell>
							{row.tenant ? (
								<span className="text-sm">{row.tenant}</span>
							) : (
								<span
									aria-label="No tenants"
									className="text-sm text-muted-foreground"
								>
									--
								</span>
							)}
						</TableCell>
						<TableCell>
							<span
								className={
									row.leaseStatus === "active"
										? "text-sm font-medium text-foreground"
										: row.leaseStatus === "expiring"
											? "text-sm font-medium text-amber-600 dark:text-amber-500"
											: "text-sm text-muted-foreground"
								}
							>
								{row.leaseStatus === "active" && "Active"}
								{row.leaseStatus === "expiring" && "Expiring Soon"}
								{row.leaseStatus === "vacant" && "Vacant"}
							</span>
						</TableCell>
						<TableCell className="text-right tabular-nums">
							{formatCurrency(row.rent, {
								minimumFractionDigits: 0,
								maximumFractionDigits: 0,
							})}
						</TableCell>
						<TableCell className="text-right">
							{row.maintenanceOpen > 0 ? (
								<span className="text-sm font-medium tabular-nums text-red-600 dark:text-red-500">
									{row.maintenanceOpen} open
								</span>
							) : (
								<span
									aria-label="No open requests"
									className="text-sm text-muted-foreground"
								>
									--
								</span>
							)}
						</TableCell>
						<TableCell>
							<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<Link
									href={`/properties/${row.id}/edit`}
									className="p-1.5 text-muted-foreground hover:text-foreground rounded"
									aria-label={`Edit ${row.property}`}
								>
									Edit
								</Link>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
