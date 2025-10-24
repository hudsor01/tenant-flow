import type { Metadata } from 'next'
import { requireSession } from '@/lib/server-auth'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { tenantsApi } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import type { TenantStats, TenantWithLeaseInfo } from '@repo/shared/types/core'
import { TenantsTableClient } from './tenants-table.client'
import { columns } from './columns'

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
		<div className="space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
					<p className="text-muted-foreground">Manage your property tenants and their lease information.</p>
				</div>
				<Button asChild>
					<Link href="/manage/tenants/new">
						<Plus className="size-4 mr-2" />
						Add Tenant
					</Link>
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardDescription>Total Tenants</CardDescription>
						<CardTitle className="text-2xl font-semibold">{stats.total ?? tenants.length}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Active Tenants</CardDescription>
						<CardTitle className="text-2xl font-semibold">{stats.active ?? 0}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Current Payments</CardDescription>
						<CardTitle className="text-2xl font-semibold">{stats.currentPayments ?? 0}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Late Payments</CardDescription>
						<CardTitle className="text-2xl font-semibold text-destructive">{stats.latePayments ?? 0}</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{/* Client Component for Delete Functionality */}
			<TenantsTableClient columns={columns} initialTenants={tenants} />
		</div>
	)
}
