import type { Metadata } from 'next'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { tenantsApi } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import type { TenantStats, TenantWithLeaseInfo } from '@repo/shared/types/core'
import { TenantsTableClient } from './tenants-table.client'

export const metadata: Metadata = {
	title: 'Tenants | TenantFlow',
	description: 'Manage your property tenants and their lease information'
}

const logger = createLogger({ component: 'TenantsPage' })

export default async function TenantsPage() {
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

	// ✅ Inline columns - NO wrapper file
	const columns: ColumnDef<TenantWithLeaseInfo>[] = [
		{
			accessorKey: 'name',
			header: 'Tenant',
			cell: ({ row }) => {
				const tenant = row.original
				return (
					<Link href={`/manage/tenants/${tenant.id}`} className="hover:underline">
						<div className="flex flex-col">
							<span className="font-medium">{tenant.name}</span>
							<span className="text-sm text-muted-foreground">{tenant.email}</span>
						</div>
					</Link>
				)
			}
		},
		{
			accessorKey: 'property',
			header: 'Property',
			cell: ({ row }) => {
				const tenant = row.original
				return tenant.property?.name ? (
					<div className="flex flex-col">
						<span>{tenant.property.name}</span>
						<span className="text-sm text-muted-foreground">
							{tenant.property.city}, {tenant.property.state}
						</span>
					</div>
				) : (
					<span className="text-muted-foreground">No property</span>
				)
			}
		},
		{
			accessorKey: 'paymentStatus',
			header: 'Status',
			cell: ({ row }) => {
				const tenant = row.original
				return (
					<div className="flex flex-col gap-1">
						<Badge
							variant={
								tenant.paymentStatus === 'Overdue'
									? 'destructive'
									: tenant.paymentStatus === 'Current'
										? 'secondary'
										: 'outline'
							}
						>
							{tenant.paymentStatus}
						</Badge>
						<Badge variant="outline">{tenant.leaseStatus}</Badge>
					</div>
				)
			}
		},
		{
			accessorKey: 'currentLease',
			header: 'Lease',
			cell: ({ row }) => {
				const tenant = row.original
				return tenant.currentLease ? (
					<div className="flex flex-col">
						<span className="text-sm">#{tenant.currentLease.id.slice(0, 8)}</span>
						<span className="text-sm text-muted-foreground">
							{tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString() : 'Start TBD'} -{' '}
							{tenant.leaseEnd ? new Date(tenant.leaseEnd).toLocaleDateString() : 'End TBD'}
						</span>
					</div>
				) : (
					<span className="text-muted-foreground">No active lease</span>
				)
			}
		},
		{
			accessorKey: 'monthlyRent',
			header: 'Monthly Rent',
			cell: ({ row }) => {
				const rent = row.getValue('monthlyRent') as number | null
				return rent ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rent) : '-'
			}
		}
	]

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
					<p className="text-muted-foreground">Manage your property tenants and their lease information.</p>
				</div>
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
