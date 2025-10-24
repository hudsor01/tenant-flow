import { Button } from '@/components/ui/button'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { tenantsApi } from '@/lib/api-client'
import { requireSession } from '@/lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { TenantStats, TenantWithLeaseInfo } from '@repo/shared/types/core'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
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
		newThisMonth: 0,
		currentPayments: 0,
		latePayments: 0
	}

	try {
		const result = await Promise.all([tenantsApi.list(), tenantsApi.stats()])
		tenants = result[0] ?? []
		stats = result[1] ?? stats
	} catch (err) {
		// Log server-side; avoid throwing to prevent resetting the RSC tree
		logger.warn('Failed to fetch tenants or stats for TenantsPage', {
			error: err instanceof Error ? err.message : String(err)
		})
	}

	return (
		<div className="flex-1 flex flex-col gap-8 px-8 py-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
					<p className="text-muted-foreground">
						Manage your property tenants and their lease information.
					</p>
				</div>
				<Button asChild>
					<Link href="/manage/tenants/new">
						<Plus className="size-4 mr-2" />
						Add Tenant
					</Link>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total Tenants</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.total ?? tenants.length}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Active Tenants</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.active ?? 0}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Current Payments</CardDescription>
						<CardTitle className="text-2xl font-semibold">
							{stats.currentPayments ?? 0}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Late Payments</CardDescription>
						<CardTitle className="text-2xl font-semibold text-destructive">
							{stats.latePayments ?? 0}
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
