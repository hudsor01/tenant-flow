"use client";

import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays } from "date-fns";
import { ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { Skeleton } from "#components/ui/skeleton";
import { leaseQueries } from "#hooks/api/query-keys/lease-keys";
import { formatDate, parseLocalYmd } from "#lib/formatters/date";

function daysUntil(dateIso: string): number {
	return Math.max(
		0,
		differenceInCalendarDays(
			parseLocalYmd(dateIso) ?? new Date(dateIso),
			new Date(),
		),
	);
}

export function ExpiringLeasesWidget() {
	const { data, isLoading } = useQuery(leaseQueries.expiringEnriched());

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="size-4 text-warning-text" aria-hidden="true" />
						Leases expiring soon
					</CardTitle>
					<CardDescription>Next 60 days</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</CardContent>
			</Card>
		);
	}

	const leases = data ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Clock className="size-4 text-warning-text" aria-hidden="true" />
					Leases expiring soon
				</CardTitle>
				<CardDescription>
					{leases.length === 0
						? "No leases expiring in the next 60 days."
						: `${leases.length} lease${leases.length === 1 ? "" : "s"} expiring in the next 60 days.`}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{leases.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						You&apos;re all caught up. New reminders will appear here 60 days
						before each lease ends.
					</p>
				) : (
					<>
						<ul className="divide-y divide-border">
							{leases.map((lease) => {
								const days = daysUntil(lease.end_date);
								const urgent = days <= 7;
								return (
									<li key={lease.id} className="py-3">
										<Link
											href={`/leases/${lease.id}`}
											className="flex items-center justify-between gap-3 rounded-md -mx-2 px-2 py-1.5 transition-colors hover:bg-accent"
										>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-foreground">
													{lease.tenant_name ?? "Tenant"}
													{lease.unit_name ? ` · ${lease.unit_name}` : ""}
												</p>
												<p className="truncate text-xs text-muted-foreground">
													{lease.property_name ?? "Property"} · ends{" "}
													{formatDate(lease.end_date, {
														formatOptions: {
															month: "short",
															day: "numeric",
															year: "numeric",
															timeZone: "UTC",
														},
													})}
												</p>
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<span
													className={`text-xs font-semibold ${urgent ? "text-destructive-text" : "text-warning-text"}`}
												>
													{days} day{days === 1 ? "" : "s"}
												</span>
												<ChevronRight
													className="size-4 text-muted-foreground"
													aria-hidden="true"
												/>
											</div>
										</Link>
									</li>
								);
							})}
						</ul>
						<div className="pt-3">
							<Link
								href="/leases"
								className="text-sm font-medium text-primary-text hover:underline"
							>
								View all leases →
							</Link>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
