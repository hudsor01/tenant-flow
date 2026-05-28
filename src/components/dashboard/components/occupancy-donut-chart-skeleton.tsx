/**
 * Loading skeleton for {@link OccupancyDonutChart}. Lives in its own module so
 * `dashboard.tsx` can static-import the skeleton without dragging Recharts
 * (~200KB gzipped) into the dashboard's main bundle chunk — the chart itself
 * is `next/dynamic`-imported with this skeleton as the `loading:` fallback.
 *
 * 04-UI-SPEC § 7.4 — three-state mutual exclusion (skeleton ↔ data ↔ empty).
 * 04-UI-SPEC § 7.5 — code-split preservation via skeleton extraction.
 */

import { Card, CardContent, CardHeader } from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";

export function OccupancyDonutChartSkeleton() {
	return (
		<Card className="lg:col-span-1">
			<CardHeader>
				<Skeleton className="h-5 w-24" />
				<Skeleton className="mt-2 h-4 w-28" />
			</CardHeader>
			<CardContent className="flex flex-col items-center gap-4">
				<Skeleton className="size-[160px] rounded-full" />
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-2">
						<Skeleton className="size-2.5 rounded-full" />
						<Skeleton className="h-3 w-20" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="size-2.5 rounded-full" />
						<Skeleton className="h-3 w-16" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
