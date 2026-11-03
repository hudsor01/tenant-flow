"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import { ChartLoadingSkeleton } from "#components/shared/chart-loading-skeleton";
import { BlurFade } from "#components/ui/blur-fade";
import { Skeleton } from "#components/ui/skeleton";
import { analyticsQueries } from "#hooks/api/use-analytics";

const OccupancyTrendChart = dynamic(
	() => import("./property-charts").then((mod) => mod.OccupancyTrendChart),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> },
);

export function PropertyInsightsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="bg-card border border-border rounded-lg p-6">
				<Skeleton className="h-5 w-32 mb-2" />
				<Skeleton className="h-4 w-48 mb-6" />
				<Skeleton className="h-64 w-full" />
			</div>
		</div>
	);
}

export function PropertyInsightsSection() {
	const { data } = useSuspenseQuery(analyticsQueries.occupancyPageData());

	const { trends = [] } = data;

	// "Vacancy hotspots" (properties with the most vacancy days) went: no
	// unit's status history is kept, so no vacancy day is known and the list
	// could only ever be empty.
	return (
		<div className="space-y-6">
			<BlurFade delay={0.1}>
				<div className="bg-card border border-border rounded-lg p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="font-medium text-foreground">Occupancy trends</h3>
							<p className="text-sm text-muted-foreground">
								Portfolio occupancy rate over time
							</p>
						</div>
						<TrendingUp className="w-5 h-5 text-muted-foreground" />
					</div>
					<OccupancyTrendChart data={trends} />
				</div>
			</BlurFade>
		</div>
	);
}
