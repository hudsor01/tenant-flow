'use client'

/**
 * PayoutTimingCard (admin-only)
 * -----------------------------
 * Surfaces P50/P95/max payout duration over a 30-day rolling window.
 * Backed by admin-only `get_payout_timing_stats()` RPC.
 *
 * The card itself accepts `isAdmin` and renders nothing for non-admin users
 * so the RPC is never invoked outside of the admin surface. This keeps the
 * 2-day payout SLA claim verifiable from the dashboard at a glance.
 */

import { useQuery } from '@tanstack/react-query'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { payoutTimingQueries } from '#hooks/api/query-keys/payout-timing-keys'
import { TrendingUp, AlertTriangle } from 'lucide-react'

interface Props {
	isAdmin: boolean
}

function formatHours(hours: number | null): string {
	if (hours === null) return '--'
	if (hours < 1) return `${Math.round(hours * 60)}m`
	if (hours < 48) return `${hours.toFixed(1)}h`
	return `${(hours / 24).toFixed(1)}d`
}

export function PayoutTimingCard({ isAdmin }: Props) {
	const { data, isLoading, isError } = useQuery(
		payoutTimingQueries.stats({ enabled: isAdmin })
	)

	if (!isAdmin) return null

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Payout timing</CardTitle>
					<CardDescription>30-day rolling window</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="h-4 w-48" />
				</CardContent>
			</Card>
		)
	}

	if (isError || !data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Payout timing</CardTitle>
					<CardDescription>Unable to load</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	const slaBreached = (data.p95Hours ?? 0) > 48 || data.over48hCount > 0

	return (
		<Card data-testid="payout-timing-card">
			<CardHeader className="flex flex-row items-start gap-2 space-y-0">
				<TrendingUp
					className="h-4 w-4 mt-1 text-muted-foreground"
					aria-hidden="true"
				/>
				<div>
					<CardTitle>Payout timing</CardTitle>
					<CardDescription>
						Last {data.windowDays} days &middot; {data.paidCount} payouts
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-3 gap-3 text-center">
					<div>
						<p className="text-xs text-muted-foreground">P50</p>
						<p className="text-xl font-semibold tabular-nums">
							{formatHours(data.p50Hours)}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">P95</p>
						<p className="text-xl font-semibold tabular-nums">
							{formatHours(data.p95Hours)}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">Max</p>
						<p className="text-xl font-semibold tabular-nums">
							{formatHours(data.maxHours)}
						</p>
					</div>
				</div>
				{slaBreached ? (
					<div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
						<AlertTriangle className="h-4 w-4" aria-hidden="true" />
						<span>
							{data.over48hCount} payout
							{data.over48hCount === 1 ? '' : 's'} over 48h
						</span>
					</div>
				) : (
					<p className="text-xs text-muted-foreground">
						{data.failedCount} failed &middot; {data.pendingCount} pending
					</p>
				)}
			</CardContent>
		</Card>
	)
}
