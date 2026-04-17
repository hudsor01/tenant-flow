'use client'

/**
 * AutopayHealthCard
 * -----------------
 * Owner dashboard widget that surfaces autopay enrollment rate and pg_cron run
 * health. Backed by `get_autopay_health(uuid)` RPC.
 *
 * Rendered inside OwnerDashboard; shows loading skeleton while fetching and a
 * compact inline state summary otherwise. Red if the last cron run failed,
 * amber if there were decline failures in the last 30 days, green otherwise.
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
import { autopayHealthQueries } from '#hooks/api/query-keys/autopay-health-keys'
import { CheckCircle2, AlertTriangle, XCircle, Zap } from 'lucide-react'

function formatRelative(iso: string | null): string {
	if (!iso) return 'Never'
	const diffMs = Date.now() - new Date(iso).getTime()
	if (diffMs < 0) return 'Scheduled'
	const minutes = Math.floor(diffMs / 60000)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	return `${days}d ago`
}

export function AutopayHealthCard() {
	const { data, isLoading, isError } = useQuery(autopayHealthQueries.detail())

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Autopay health</CardTitle>
					<CardDescription>Enrollment + last cron run</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-4 w-40" />
				</CardContent>
			</Card>
		)
	}

	if (isError || !data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Autopay health</CardTitle>
					<CardDescription>Unable to load</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	const {
		enrolledCount,
		totalActiveLeases,
		enrollmentRate,
		lastRunAt,
		lastRunSucceeded,
		failures30d
	} = data

	// Status banner: red if last run failed, amber if any declines in 30d, green otherwise.
	const status: 'healthy' | 'warning' | 'error' =
		lastRunSucceeded === false
			? 'error'
			: failures30d > 0
				? 'warning'
				: 'healthy'

	const StatusIcon =
		status === 'error'
			? XCircle
			: status === 'warning'
				? AlertTriangle
				: CheckCircle2
	const statusColor =
		status === 'error'
			? 'text-destructive'
			: status === 'warning'
				? 'text-amber-600 dark:text-amber-400'
				: 'text-emerald-600 dark:text-emerald-400'
	const statusLabel =
		status === 'error'
			? 'Last autopay run failed'
			: status === 'warning'
				? `${failures30d} decline${failures30d === 1 ? '' : 's'} in last 30 days`
				: 'All autopay runs healthy'

	return (
		<Card data-testid="autopay-health-card">
			<CardHeader className="flex flex-row items-start gap-2 space-y-0">
				<Zap className="h-4 w-4 mt-1 text-muted-foreground" aria-hidden="true" />
				<div>
					<CardTitle>Autopay health</CardTitle>
					<CardDescription>Enrollment + last cron run</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					<p className="text-3xl font-semibold tabular-nums">
						{enrollmentRate.toFixed(1)}%
					</p>
					<p className="text-sm text-muted-foreground">
						{enrolledCount} of {totalActiveLeases} active lease
						{totalActiveLeases === 1 ? '' : 's'} enrolled
					</p>
				</div>
				<div className={`flex items-center gap-2 text-sm ${statusColor}`}>
					<StatusIcon className="h-4 w-4" aria-hidden="true" />
					<span>{statusLabel}</span>
				</div>
				<p className="text-xs text-muted-foreground">
					Last run {formatRelative(lastRunAt)}
				</p>
			</CardContent>
		</Card>
	)
}
