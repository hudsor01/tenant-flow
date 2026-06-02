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
						Trailing 12-month revenue, expenses, and occupancy
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-24 w-full" />
						))}
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
						Trailing 12-month revenue, expenses, and occupancy
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						No performance data yet. Metrics will appear once you have recorded
						rent, expenses, or leases for this property.
					</p>
				</CardContent>
			</Card>
		);
	}

	const metrics = [
		{
			label: "Revenue",
			value: formatCurrency(data.total_revenue ?? 0),
			icon: DollarSign,
			tone: "text-success-text",
		},
		{
			label: "Expenses",
			value: formatCurrency(data.total_expenses ?? 0),
			icon: Receipt,
			tone: "text-destructive-text",
		},
		{
			label: "Net Income",
			value: formatCurrency(data.net_income ?? 0),
			icon: TrendingUp,
			tone:
				(data.net_income ?? 0) >= 0
					? "text-success-text"
					: "text-destructive-text",
		},
		{
			label: "Occupancy",
			value: formatPercentage(data.occupancy_rate ?? 0),
			icon: Percent,
			tone: "text-info-text",
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Performance (last 12 months)</CardTitle>
				<CardDescription>
					Trailing 12-month revenue, expenses, and occupancy
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
										className={`size-4 ${metric.tone}`}
										aria-hidden="true"
									/>
								</div>
								<div className={`text-2xl font-semibold ${metric.tone}`}>
									{metric.value}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
