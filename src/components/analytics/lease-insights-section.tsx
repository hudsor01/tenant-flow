"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { DollarSign } from "lucide-react";
import { LeaseProfitabilityTable } from "#components/analytics/lease-profitability-table";
import { BlurFade } from "#components/ui/blur-fade";
import { Skeleton } from "#components/ui/skeleton";
import { analyticsQueries } from "#hooks/api/use-analytics";
import { useIsClient } from "#hooks/use-is-client";

export function LeaseInsightsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="bg-card border border-border rounded-lg p-6">
				<Skeleton className="h-5 w-40 mb-2" />
				<Skeleton className="h-4 w-56 mb-6" />
				<Skeleton className="h-64 w-full" />
			</div>
		</div>
	);
}

/**
 * The leases page's insights: each lease's rent received less its expenses.
 * The "Lease lifecycle" (renewals, expirations and notices over time) and
 * "Status breakdown" charts went: no source records a lease's renewals or
 * notices over time, and lifecycle and statusBreakdown were always written as
 * [], so both charts could only ever be empty.
 */
export function LeaseInsightsSection() {
	// Owner data loads in the browser only: rendered on the server, the
	// suspense query below would run there without a session (useIsClient).
	const isClient = useIsClient();
	if (!isClient) return <LeaseInsightsSkeleton />;
	return <LeaseInsightsSectionContent />;
}

function LeaseInsightsSectionContent() {
	const { data: profitability } = useSuspenseQuery(
		analyticsQueries.leaseProfitability(),
	);

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1}>
				<div className="bg-card border border-border rounded-lg p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="font-medium text-foreground">
								Lease profitability
							</h3>
							<p className="mb-0 text-sm text-muted-foreground">
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
