"use client";

import { useQuery } from "@tanstack/react-query";
import { DollarSign, Percent, Receipt, TrendingUp } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";
import { formatDate } from "#lib/formatters/date";
import { formatCurrency, formatPercentage } from "#lib/utils/currency";

interface PropertyPerformanceSectionProps {
	propertyId: string;
}

export function PropertyPerformanceSection({
	propertyId,
}: PropertyPerformanceSectionProps) {
	const { data, isLoading, isError } = useQuery(
		propertyQueries.performance(propertyId),
	);

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Performance (last 12 months)</CardTitle>
					<CardDescription>
						Trailing 12-month rent received and expenses; current occupancy
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="@container/property-performance">
						<div className="grid grid-cols-1 @min-[25rem]/property-performance:grid-cols-2 @min-[51rem]/property-performance:grid-cols-4 gap-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-24 w-full" />
							))}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isError || !data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Performance (last 12 months)</CardTitle>
					<CardDescription>
						Trailing 12-month rent received and expenses; current occupancy
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="mb-0 text-sm text-muted-foreground">
						No performance data yet. Metrics will appear once you have recorded
						rent, expenses, or leases for this property.
					</p>
				</CardContent>
			</Card>
		);
	}

	// The server's body before 20261110123116 reports no rent received, and its
	// expenses cover another window: the money tiles say so instead of $0.
	const property =
		data.status === "ready" ? (data.properties[0] ?? null) : null;
	const occupancyRate =
		data.status === "ready"
			? (data.properties[0]?.occupancyRate ?? 0)
			: (data.occupancy[0]?.occupancyRate ?? 0);
	const unavailable = "Unavailable";
	const muted = "text-muted-foreground";
	const metrics = [
		{
			label: "Rent Received",
			value: property ? formatCurrency(property.rentReceived) : unavailable,
			icon: DollarSign,
			tone: property ? "text-success-text" : muted,
		},
		{
			label: "Expenses",
			value: property ? formatCurrency(property.expenses) : unavailable,
			icon: Receipt,
			tone: property ? "text-destructive-text" : muted,
		},
		{
			label: "Net Income",
			value: property ? formatCurrency(property.netIncome) : unavailable,
			icon: TrendingUp,
			tone: !property
				? muted
				: property.netIncome >= 0
					? "text-success-text"
					: "text-destructive-text",
		},
		{
			label: "Occupancy",
			value: formatPercentage(occupancyRate),
			icon: Percent,
			tone: "text-info-text",
		},
	];
	const statedWindow = data.status === "ready" ? data.window : null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Performance (last 12 months)</CardTitle>
				<CardDescription>
					{statedWindow
						? `Rent received and expenses, ${formatDate(statedWindow.start_date)} to ${formatDate(statedWindow.end_date)}. Occupancy is current.`
						: "Rent received isn't available yet. Occupancy is current."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{/* The columns step on the card's own width, never the viewport's
				    (66.2-39 fix round 4, Part 8c): one until two tiles hold the
				    longest figure, four from where four do; the icon never
				    shrinks and no figure wraps. */}
				<div className="@container/property-performance">
					<div className="grid grid-cols-1 @min-[25rem]/property-performance:grid-cols-2 @min-[51rem]/property-performance:grid-cols-4 gap-4">
						{metrics.map((metric) => {
							const Icon = metric.icon;
							return (
								<div
									key={metric.label}
									className="rounded-lg border border-border bg-card p-4"
								>
									<div className="flex items-center justify-between mb-2">
										<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
											{metric.label}
										</span>
										<Icon
											className={`size-4 shrink-0 ${metric.tone}`}
											aria-hidden="true"
										/>
									</div>
									<div
										className={`whitespace-nowrap text-2xl font-semibold ${metric.tone}`}
									>
										{metric.value}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
