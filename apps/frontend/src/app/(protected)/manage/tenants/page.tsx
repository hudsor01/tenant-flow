'use client'

import { createLogger } from '@repo/shared/lib/frontend-logger'
import { tenantsApi } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ColumnDef } from '@tanstack/react-table'
import type { TenantStats, TenantWithLeaseInfo } from '@repo/shared/types/core'

const logger = createLogger({ component: 'TenantsPage' })

async function deleteTenant(tenantId: string) {
	try {
		await tenantsApi.remove(tenantId)
		return { success: true }
	} catch (error) {
		logger.error('Failed to delete tenant', {
			action: 'deleteTenant',
			metadata: {
				tenantId,
				error: error instanceof Error ? error.message : String(error)
			}
		})
		throw error
	}
}

export default function TenantsPage() {
	const [data, setData] = useState<{ tenants: TenantWithLeaseInfo[]; stats: TenantStats } | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		Promise.all([tenantsApi.list(), tenantsApi.stats()]).then(([tenants, stats]) => {
			setData({ tenants, stats })
			setIsLoading(false)
		})
	}, [])

	if (isLoading || !data) {
		return <div className="flex items-center justify-center py-12">Loading...</div>
	}

	return <TenantsClient initialTenants={data.tenants} initialStats={data.stats} deleteAction={deleteTenant} />
}

function TenantsClient({
	initialTenants,
	initialStats,
	deleteAction
}: {
	initialTenants: TenantWithLeaseInfo[]
	initialStats: TenantStats
	deleteAction: (id: string) => Promise<{ success: boolean }>
}) {
	const [isPending, startTransition] = useTransition()
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [optimisticTenants, removeOptimistic] = useOptimistic(
		initialTenants,
		(state, tenantId: string) => state.filter(t => t.id !== tenantId)
	)

	const handleDelete = (tenantId: string, tenantName: string) => {
		setDeletingId(tenantId)
		startTransition(async () => {
			removeOptimistic(tenantId)
			try {
				await deleteAction(tenantId)
				toast.success(`Tenant "${tenantName}" deleted`)
			} catch (error) {
				logger.error('Delete failed', { action: 'handleDelete', metadata: { tenantId, error } })
				toast.error('Failed to delete tenant')
			} finally {
				setDeletingId(null)
			}
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
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const tenant = row.original
				return (
					<div className="flex items-center justify-end gap-1">
						<Button asChild size="sm" variant="ghost">
							<Link href={`/manage/tenants/${tenant.id}`}>View</Link>
						</Button>
						<Button asChild size="sm" variant="ghost">
							<Link href={`/manage/tenants/${tenant.id}/edit`}>Edit</Link>
						</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
									<Trash2 className="size-4" />
									<span className="sr-only">Delete</span>
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete tenant</AlertDialogTitle>
									<AlertDialogDescription>
										Permanently delete <strong>{tenant.name}</strong> and associated leases?
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										disabled={isPending && deletingId === tenant.id}
										onClick={() => handleDelete(tenant.id, tenant.name)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{isPending && deletingId === tenant.id ? 'Deleting...' : 'Delete'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)
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
						<CardTitle className="text-2xl font-semibold">{initialStats.total ?? optimisticTenants.length}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Active Tenants</CardDescription>
						<CardTitle className="text-2xl font-semibold">{initialStats.active ?? 0}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Current Payments</CardDescription>
						<CardTitle className="text-2xl font-semibold">{initialStats.currentPayments ?? 0}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Late Payments</CardDescription>
						<CardTitle className="text-2xl font-semibold text-destructive">{initialStats.latePayments ?? 0}</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{/* Inline DataTable */}
			<Card>
				<CardHeader>
					<CardTitle>Tenants</CardTitle>
					<CardDescription>Manage tenants and lease information</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable columns={columns} data={optimisticTenants} filterColumn="name" filterPlaceholder="Filter by tenant name..." />
				</CardContent>
			</Card>
		</div>
	)
}
