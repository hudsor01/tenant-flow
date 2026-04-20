'use client'

import { queryOptions, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { leaseQueries } from '#hooks/api/query-keys/lease-keys'

interface ExpiringLeaseRow {
	id: string
	end_date: string
	rent_amount: number
	tenant_name: string | null
	unit_name: string | null
	property_name: string | null
}

/**
 * Enriched expiring-lease list joined with tenant + unit + property for
 * the dashboard widget. Uses PostgREST FK join; limits to next 60 days.
 */
const expiringLeasesWithContext = queryOptions({
	queryKey: [...leaseQueries.all(), 'expiring-enriched', 60],
	queryFn: async (): Promise<ExpiringLeaseRow[]> => {
		const supabase = createClient()
		const now = new Date().toISOString()
		const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

		const { data, error } = await supabase
			.from('leases')
			.select(`
				id,
				end_date,
				rent_amount,
				tenants:primary_tenant_id (name),
				units:unit_id (
					name,
					properties:property_id (name)
				)
			`)
			.eq('lease_status', 'active')
			.lte('end_date', future)
			.gte('end_date', now)
			.order('end_date', { ascending: true })
			.limit(5)

		if (error) handlePostgrestError(error, 'leases')

		type Row = {
			id: string
			end_date: string
			rent_amount: number
			tenants: { name: string | null } | null
			units: { name: string | null; properties: { name: string | null } | null } | null
		}

		return ((data ?? []) as unknown as Row[]).map(row => ({
			id: row.id,
			end_date: row.end_date,
			rent_amount: row.rent_amount,
			tenant_name: row.tenants?.name ?? null,
			unit_name: row.units?.name ?? null,
			property_name: row.units?.properties?.name ?? null
		}))
	},
	staleTime: 5 * 60 * 1000
})

function daysUntil(dateIso: string): number {
	const ms = new Date(dateIso).getTime() - Date.now()
	return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function ExpiringLeasesWidget() {
	const { data, isLoading } = useQuery(expiringLeasesWithContext)

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="size-4 text-amber-600" aria-hidden="true" />
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
		)
	}

	const leases = data ?? []

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Clock className="size-4 text-amber-600" aria-hidden="true" />
					Leases expiring soon
				</CardTitle>
				<CardDescription>
					{leases.length === 0
						? 'No leases expiring in the next 60 days.'
						: `${leases.length} lease${leases.length === 1 ? '' : 's'} expiring in the next 60 days.`}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{leases.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						You&apos;re all caught up. New reminders will appear here 60 days before each lease ends.
					</p>
				) : (
					<>
						<ul className="divide-y divide-border">
							{leases.map(lease => {
								const days = daysUntil(lease.end_date)
								const urgent = days <= 7
								return (
									<li key={lease.id} className="py-3">
										<Link
											href={`/leases/${lease.id}`}
											className="flex items-center justify-between gap-3 rounded-md -mx-2 px-2 py-1.5 transition-colors hover:bg-accent"
										>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-foreground">
													{lease.tenant_name ?? 'Tenant'}
													{lease.unit_name ? ` · ${lease.unit_name}` : ''}
												</p>
												<p className="truncate text-xs text-muted-foreground">
													{lease.property_name ?? 'Property'} · ends{' '}
													{new Date(lease.end_date).toLocaleDateString('en-US', {
														month: 'short',
														day: 'numeric',
														year: 'numeric'
													})}
												</p>
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<span
													className={`text-xs font-semibold ${urgent ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}`}
												>
													{days} day{days === 1 ? '' : 's'}
												</span>
												<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
											</div>
										</Link>
									</li>
								)
							})}
						</ul>
						<div className="pt-3">
							<Link
								href="/leases"
								className="text-sm font-medium text-primary hover:underline"
							>
								View all leases →
							</Link>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}
