"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ChartLoadingSkeleton } from "#components/shared/chart-loading-skeleton";
import { analyticsQueries } from "#hooks/api/use-analytics";

const ChartAreaInteractive = dynamic(
	() =>
		import("#components/dashboard/chart-area-interactive").then(
			(mod) => mod.ChartAreaInteractive,
		),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

import { BarChart3, Building2 } from "lucide-react";
import { OwnerPaymentSummary } from "#components/analytics/owner-payment-summary";
import { Badge } from "#components/ui/badge";
import { BlurFade } from "#components/ui/blur-fade";
import { Skeleton } from "#components/ui/skeleton";
import {
	useDashboardStats,
	usePropertyPerformance,
} from "#hooks/api/use-dashboard-hooks";
import { formatCurrency } from "#lib/utils/currency";
import type { PropertyPerformance } from "#types/core";
import { AnalyticsStatCards } from "./analytics-stat-cards";

/** How many properties the Top Performing Properties card lists. */
const TOP_PROPERTY_COUNT = 5;

/**
 * The card's properties: highest monthly revenue first (the scheduled rent of
 * each property's active leases), ties by name, the first five.
 */
function topPropertiesByRevenue(
	properties: readonly PropertyPerformance[],
): PropertyPerformance[] {
	return [...properties]
		.sort(
			(a, b) =>
				b.monthlyRevenue - a.monthlyRevenue ||
				a.property.localeCompare(b.property),
		)
		.slice(0, TOP_PROPERTY_COUNT);
}

function AnalyticsSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-7 w-32 mb-2" />
					<Skeleton className="h-5 w-64" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-sm border bg-card p-4 shadow-sm">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-20 mb-2" />
						<Skeleton className="h-4 w-16" />
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-48 mb-6" />
					<Skeleton className="h-48 w-full" />
				</div>
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-40 mb-2" />
					<Skeleton className="h-4 w-36 mb-6" />
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-14 w-full" />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function AnalyticsPage() {
	const { data: overviewData, isLoading: overviewLoading } = useQuery(
		analyticsQueries.overviewPageData(),
	);
	const { data: paymentSummary, isError: paymentSummaryError } = useQuery(
		analyticsQueries.ownerPaymentSummary(),
	);
	const { data: dashboardStats } = useDashboardStats();
	const {
		data: propertyPerformance,
		isLoading: propertiesLoading,
		isError: propertiesError,
	} = usePropertyPerformance();

	if (overviewLoading) {
		return <AnalyticsSkeleton />;
	}

	const { financial } = overviewData || {};
	const financialMetrics = financial?.metrics;
	const topProperties = topPropertiesByRevenue(propertyPerformance ?? []);

	const occupancyRate = dashboardStats?.stats?.units?.occupancyRate ?? 0;
	const occupancyChange = dashboardStats?.stats?.units?.occupancyChange ?? 0;
	const activeTenants = dashboardStats?.stats?.units?.occupied ?? 0;
	const monthlyRevenue = dashboardStats?.stats?.revenue?.monthly ?? 0;
	const revenueGrowth = dashboardStats?.stats?.revenue?.growth ?? 0;
	const openMaintenance = dashboardStats?.stats?.maintenance?.open ?? 0;
	const maintenanceChange =
		dashboardStats?.metricTrends?.openMaintenance?.change ?? 0;
	const avgRoi =
		financialMetrics?.netIncome && financialMetrics?.totalRevenue
			? (financialMetrics.netIncome / financialMetrics.totalRevenue) * 100
			: 0;
	const tenantsChange = Math.max(0, Math.round(occupancyChange * 10));

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1}>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Analytics</h1>
						<p className="text-muted-foreground">
							Portfolio performance and insights.
						</p>
					</div>
				</div>
			</BlurFade>

			<AnalyticsStatCards
				occupancyRate={occupancyRate}
				occupancyChange={occupancyChange}
				activeTenants={activeTenants}
				tenantsChange={tenantsChange}
				monthlyRevenue={monthlyRevenue}
				revenueGrowth={revenueGrowth}
				avgRoi={avgRoi}
				openMaintenance={openMaintenance}
				maintenanceChange={maintenanceChange}
			/>

			<BlurFade delay={0.55}>
				<div className="mb-8">
					<OwnerPaymentSummary
						summary={paymentSummary}
						isError={paymentSummaryError}
					/>
				</div>
			</BlurFade>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<BlurFade delay={0.6}>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Revenue & Expenses Trend
								</h3>
								<p className="text-sm text-muted-foreground">
									6-month performance overview
								</p>
							</div>
							<BarChart3 className="w-5 h-5 text-muted-foreground" />
						</div>
						<div className="flex items-center gap-4 mb-4">
							<div className="flex items-center gap-2">
								<div className="size-3 rounded-sm bg-chart-1" />
								<span className="text-sm text-muted-foreground">Revenue</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="size-3 rounded-sm bg-chart-4" />
								<span className="text-sm text-muted-foreground">Expenses</span>
							</div>
						</div>
						<ChartAreaInteractive />
					</div>
				</BlurFade>

				<BlurFade delay={0.7}>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Top Performing Properties
								</h3>
								<p className="text-sm text-muted-foreground">
									Ranked by monthly revenue
								</p>
							</div>
						</div>
						<div className="space-y-3">
							{propertiesLoading ? (
								Array.from({ length: TOP_PROPERTY_COUNT }).map((_, i) => (
									<Skeleton key={i} className="h-14 w-full" />
								))
							) : propertiesError ? (
								<div className="text-center text-muted-foreground py-8">
									Property data could not be loaded.
								</div>
							) : topProperties.length > 0 ? (
								topProperties.map((property, index) => (
									<BlurFade
										key={property.property_id}
										delay={0.8 + index * 0.05}
									>
										<div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/20">
											<div className="flex min-w-0 items-center gap-3">
												<div className="size-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
													<Building2 className="w-5 h-5 text-primary" />
												</div>
												<div className="min-w-0">
													<p className="mb-0 truncate font-medium text-foreground">
														{property.property}
													</p>
													<p className="mb-0 text-sm text-muted-foreground">
														{formatCurrency(property.monthlyRevenue)}/mo ·{" "}
														{property.totalUnits > 0
															? `${property.occupiedUnits}/${property.totalUnits} units occupied`
															: "No units"}
													</p>
												</div>
											</div>
											{property.totalUnits > 0 && (
												<Badge
													variant={
														property.occupancyRate >= 90
															? "default"
															: "destructive"
													}
													className="shrink-0 text-xs"
												>
													{property.occupancyRate.toFixed(1)}%
												</Badge>
											)}
										</div>
									</BlurFade>
								))
							) : (
								<div className="text-center text-muted-foreground py-8">
									No property data available yet.
								</div>
							)}
						</div>
					</div>
				</BlurFade>
			</div>
		</div>
	);
}
