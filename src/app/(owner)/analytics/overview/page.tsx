"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ChartLoadingSkeleton } from "#components/shared/chart-loading-skeleton";
import { analyticsQueries } from "#hooks/api/use-analytics";
import { pluralNoun } from "#lib/formatters/count";

const ChartAreaInteractive = dynamic(
	() =>
		import("#components/dashboard/chart-area-interactive").then(
			(mod) => mod.ChartAreaInteractive,
		),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

import { Building2 } from "lucide-react";
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
			{/* The stat row's columns (66.2-39 fix round 4, Part 8c), so the loaded row does not reflow (AnalyticsStatCards). */}
			<div className="@container/analytics-stats mb-8">
				<div className="grid grid-cols-1 @min-[27rem]/analytics-stats:grid-cols-2 @min-[54.5rem]/analytics-stats:grid-cols-4 gap-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="rounded-sm border bg-card p-4 shadow-sm">
							<Skeleton className="h-4 w-24 mb-2" />
							<Skeleton className="h-8 w-20 mb-2" />
							<Skeleton className="h-4 w-16" />
						</div>
					))}
				</div>
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
	const activeTenants = dashboardStats?.stats?.units?.occupied ?? 0;
	const monthlyRevenue = dashboardStats?.stats?.revenue?.monthly ?? 0;
	const openMaintenance = dashboardStats?.stats?.maintenance?.open ?? 0;
	// Scheduled rent less expenses over scheduled rent: get_financial_overview's
	// revenue is the active leases' rent times twelve, not income.
	const scheduledMargin =
		financialMetrics?.netIncome && financialMetrics?.totalRevenue
			? (financialMetrics.netIncome / financialMetrics.totalRevenue) * 100
			: 0;

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1}>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Analytics</h1>
						<p className="mb-0 text-muted-foreground">
							Portfolio performance and insights.
						</p>
					</div>
				</div>
			</BlurFade>

			<AnalyticsStatCards
				occupancyRate={occupancyRate}
				activeTenants={activeTenants}
				monthlyRevenue={monthlyRevenue}
				scheduledMargin={scheduledMargin}
				openMaintenance={openMaintenance}
				maintenanceTrend={dashboardStats?.metricTrends?.openMaintenance}
				trends={dashboardStats?.portfolioTrends}
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
				{/* The chart carries its own card, title and range: it was wrapped in a
				    second card titled "Revenue & Expenses Trend" (its series is
				    scheduled rent) and "6-month performance overview" (its range
				    toggles 3, 6 or 12 months), as on no other page. */}
				<BlurFade delay={0.6}>
					<ChartAreaInteractive />
				</BlurFade>

				<BlurFade delay={0.7}>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Top Performing Properties
								</h3>
								<p className="mb-0 text-sm text-muted-foreground">
									Ranked by scheduled monthly rent
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
										{/* The occupancy badge wraps under the property when the
										    two do not fit one line: at 320-384 the name's column
										    was left too narrow for its figures, and $7,500.00/mo
										    ran 10.19px past it (66.2-39 fix round 4, Part 8e). */}
										<div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/20">
											<div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
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
															? `${property.occupiedUnits}/${property.totalUnits} ${pluralNoun(property.totalUnits, "unit")} occupied`
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
