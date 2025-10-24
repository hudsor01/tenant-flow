import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { getTenantsPageData, getLeasesPageData } from '@/lib/api/dashboard-server'
import { requireSession } from '@/lib/server-auth'
import { formatCents } from '@repo/shared/lib/format'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type {
	TenantStats,
	TenantSummary,
	TenantWithLeaseInfo
} from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { Metadata } from 'next'
import { columns } from './columns'
import { TenantsTableClient } from './tenants-table.client'

export const metadata: Metadata = {
	title: 'Tenants | TenantFlow',
	description: 'Manage your property tenants and their lease information'
}

export default async function TenantsPage() {
	// ✅ Server-side auth - NO client flash, instant 307 redirect
	const user = await requireSession()
	const logger = createLogger({ component: 'TenantsPage', userId: user.id })

	// ✅ Server Component: Fetch data on server during RSC render
	let tenants: TenantWithLeaseInfo[] = []
	let stats: TenantStats = {
		total: 0,
		active: 0,
		inactive: 0,
		newThisMonth: 0
	}

	// Tenant summary from backend (amounts in cents)
	let summary: TenantSummary | null = null

	// Fetch leases for invitation dialog
	let availableLeases: Array<Database['public']['Tables']['lease']['Row']> = []

	try {
		const [tenantsData, leasesData] = await Promise.all([
			getTenantsPageData(),
			getLeasesPageData()
		])

		tenants = tenantsData.tenants ?? []
		stats = (tenantsData.stats as TenantStats) ?? stats
		summary = (tenantsData.summary as TenantSummary) ?? null

		// Filter for leases without tenants (available for invitation)
		availableLeases = (leasesData.leases ?? []).filter(lease => !lease.tenantId)
	} catch (err) {
		// Log server-side; avoid throwing to prevent resetting the RSC tree
		logger.warn('Failed to fetch tenants page data for TenantsPage', {
			error: err instanceof Error ? err.message : String(err)
		})
	}

	return (
		<div className="flex-1 flex flex-col gap-8 px-8 py-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
					<p className="text-muted-foreground">
						Invite tenants to access their portal for payments, maintenance requests, and lease management.
					</p>
				</div>
			</div>

			{/* Summary / Stats Cards */}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total Tenants</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{summary ? summary.total : (stats.total ?? tenants.length)}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Active Tenants</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{summary ? summary.active : (stats.active ?? 0)}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Overdue Balance</CardDescription>
						<CardTitle className="text-2xl font-semibold text-destructive">
							{summary
								? formatCents(summary.overdueBalanceCents)
								: formatCents(0)}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Upcoming Due (30d)</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{summary ? formatCents(summary.upcomingDueCents) : formatCents(0)}
						</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{/* Client Component for Delete Functionality */}
			<section className="flex flex-col gap-4">
				<h2 className="text-xl font-semibold">Tenant Directory</h2>
				<TenantsTableClient columns={columns} initialTenants={tenants} />
			</section>
		</div>
	)
}
