"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { BarChart3, Calendar, DollarSign } from "lucide-react";
import dynamic from "next/dynamic";
import { LeaseProfitabilityTable } from "#components/analytics/lease-profitability-table";
import { ChartLoadingSkeleton } from "#components/shared/chart-loading-skeleton";
import { BlurFade } from "#components/ui/blur-fade";
import { Skeleton } from "#components/ui/skeleton";
import { analyticsQueries } from "#hooks/api/use-analytics";

const LeaseLifecycleChart = dynamic(
	() => import("./lease-charts").then((mod) => mod.LeaseLifecycleChart),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

const LeaseStatusChart = dynamic(
	() => import("./lease-charts").then((mod) => mod.LeaseStatusChart),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

export function LeaseInsightsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-48 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-40 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
			<div className="bg-card border border-border rounded-lg p-6">
				<Skeleton className="h-5 w-40 mb-2" />
				<Skeleton className="h-4 w-56 mb-6" />
				<Skeleton className="h-64 w-full" />
			</div>
		</div>
	);
}

export function LeaseInsightsSection() {
	const { data } = useSuspenseQuery(analyticsQueries.leasePageData());
	const { data: profitability } = useSuspenseQuery(
		analyticsQueries.leaseProfitability(),
	);

	const { lifecycle = [], statusBreakdown = [] } = data;

	return (
		<div className="space-y-6">
			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<BlurFade delay={0.1}>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Lease lifecycle</h3>
								<p className="text-sm text-muted-foreground">
									Renewals, expirations, and notices over time
								</p>
							</div>
							<Calendar className="w-5 h-5 text-muted-foreground" />
						</div>
						<LeaseLifecycleChart points={lifecycle} />
					</div>
				</BlurFade>

				<BlurFade delay={0.2}>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Status breakdown
								</h3>
								<p className="text-sm text-muted-foreground">
									Distribution of lease states
								</p>
							</div>
							<BarChart3 className="w-5 h-5 text-muted-foreground" />
						</div>
						<LeaseStatusChart breakdown={statusBreakdown} />
					</div>
				</BlurFade>
			</div>

			{/* Profitability Table */}
			<BlurFade delay={0.3}>
				<div className="bg-card border border-border rounded-lg p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="font-medium text-foreground">
								Lease profitability
							</h3>
							<p className="text-sm text-muted-foreground">
								Each lease&apos;s rent received less its expenses
							</p>
						</div>
						<DollarSign className="w-5 h-5 text-muted-foreground" />
					</div>
					<LeaseProfitabilityTable profitability={profitability} pageSize={8} />
				</div>
			</BlurFade>
		</div>
	);
}
