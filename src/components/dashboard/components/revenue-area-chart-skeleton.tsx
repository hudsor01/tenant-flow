/**
 * Loading skeleton for {@link RevenueAreaChart}. Lives in its own module so
 * `dashboard.tsx` can static-import the skeleton without dragging Recharts
 * (~200KB gzipped) into the dashboard's main bundle chunk — the chart itself
 * is `next/dynamic`-imported with this skeleton as the `loading:` fallback.
 *
 * 04-UI-SPEC § 7.4 — three-state mutual exclusion (skeleton ↔ data ↔ empty).
 * 04-UI-SPEC § 7.5 — code-split preservation via skeleton extraction.
 */

import { Card, CardContent, CardHeader } from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";

export function RevenueAreaChartSkeleton() {
	return (
		<Card className="lg:col-span-2">
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div className="space-y-2">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-4 w-32" />
				</div>
				<div
					className="inline-flex h-9 items-center rounded-md bg-muted p-1 opacity-60"
					aria-hidden="true"
				>
					<div className="h-7 w-12 rounded-sm bg-background shadow-sm" />
					<div className="h-7 w-12" />
				</div>
			</CardHeader>
			<CardContent>
				<Skeleton className="h-[300px] w-full rounded-md" />
			</CardContent>
		</Card>
	);
}
