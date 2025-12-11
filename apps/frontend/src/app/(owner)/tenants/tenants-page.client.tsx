'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { OwnerPaymentSummary } from '#components/analytics/owner-payment-summary'
import { tenantQueries } from '#hooks/api/queries/tenant-queries'
import { leaseQueries } from '#hooks/api/queries/lease-queries'
import { formatCents } from '@repo/shared/lib/format'
import { apiRequest } from '#lib/api-request'
import type { TenantStats } from '@repo/shared/types/core'
import type { OwnerPaymentSummaryResponse } from '@repo/shared/types/api-contracts'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { columns } from './columns'
import { TenantsTableClient } from './tenants-table.client'
import { InvitationsTableClient } from './invitations-table.client'

const defaultStats: TenantStats = {
	total: 0,
	active: 0,
	inactive: 0,
	newThisMonth: 0
}

export function TenantsPageClient() {
	// Fetch tenants
	const { data: tenantsResponse, isLoading: tenantsLoading } = useQuery(tenantQueries.list())
	const tenants = tenantsResponse?.data ?? []

	// Fetch stats
	const { data: stats = defaultStats, isLoading: statsLoading } = useQuery(tenantQueries.stats())

	// Fetch leases for invitation dialog
	const { data: leasesData } = useQuery(leaseQueries.list())
	const availableLeases = (leasesData?.data ?? []).filter((lease) => !lease.primary_tenant_id)

	// Fetch payment summary - inline query since no dedicated hook exists
	const { data: paymentSummary } = useQuery({
		queryKey: ['tenants', 'payments', 'summary'],
		queryFn: async () =>
			apiRequest<OwnerPaymentSummaryResponse>('/api/v1/tenants/payments/summary'),
		staleTime: 5 * 60 * 1000, // 5 minutes
	})

	const isLoading = tenantsLoading || statsLoading

	if (isLoading) {
		return (
			<div className="flex-1 flex flex-col gap-8 px-8 py-6">
				<div className="flex-between">
					<div>
						<Skeleton className="h-9 w-32 mb-2" />
						<Skeleton className="h-5 w-80" />
					</div>
					<Skeleton className="h-10 w-32" />
				</div>
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-24 rounded-xl" />
					))}
				</div>
				<Skeleton className="h-64 rounded-xl" />
				<Skeleton className="h-96 rounded-xl" />
			</div>
		)
	}

	return (
		<div
			data-available-leases={availableLeases.length}
			className="flex-1 flex flex-col gap-8 px-8 py-6"
		>
			<div className="flex-between">
				<div>
					<h1 className="typography-h2 tracking-tight">Tenants</h1>
					<p className="text-muted-foreground">
						Invite tenants to access their portal for payments, maintenance requests, and lease management.
					</p>
				</div>
				<div className="flex gap-2">
					<Button asChild>
						<Link href="/tenants/new">
							<Mail className="size-4 mr-2" />
							Invite Tenant
						</Link>
					</Button>
				</div>
			</div>

			{/* Summary / Stats Cards */}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total Tenants</CardDescription>
						<CardTitle className="typography-h3">
							{stats.total ?? tenants.length}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Active Tenants</CardDescription>
						<CardTitle className="typography-h3">
							{stats.active ?? 0}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Overdue Balance</CardDescription>
						<CardTitle className="typography-h3 text-destructive">
							{formatCents(0)}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Upcoming Due (30d)</CardDescription>
						<CardTitle className="typography-h3">
							{formatCents(0)}
						</CardTitle>
					</CardHeader>
				</Card>
			</div>

			<OwnerPaymentSummary summary={paymentSummary ?? null} />

			{/* Invitation Tracking - Client Component */}
			<section className="flex flex-col gap-4">
				<h2 className="typography-h4">Invitations</h2>
				<InvitationsTableClient />
			</section>

			{/* Client Component for Delete Functionality */}
			<section className="flex flex-col gap-4">
				<h2 className="typography-h4">Tenant Directory</h2>
				<TenantsTableClient columns={columns} initialTenants={tenants} />
			</section>
		</div>
	)
}
