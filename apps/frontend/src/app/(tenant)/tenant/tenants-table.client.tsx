'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/dialog'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantQueries } from '#hooks/api/queries/tenant-queries'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { Trash2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { toast } from 'sonner'

const logger = createLogger({ component: 'TenantsTable' })

import type { TenantStats, TenantWithLeaseInfo } from '@repo/shared/types/core'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'

interface TenantsTableProps {
	initialTenants: TenantWithLeaseInfo[]
	initialStats: TenantStats
	deleteTenantAction: (tenant_id: string) => Promise<{ success: boolean }>
}

export function TenantsTable({
	initialTenants,
	deleteTenantAction
}: TenantsTableProps) {
	const queryClient = useQueryClient()

	// TanStack Query mutation for delete with optimistic updates
	const { mutate: deleteTenant, isPending: isDeleting } = useMutation({
		mutationFn: deleteTenantAction,
		onMutate: async tenant_id => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: tenantQueries.list().queryKey
			})

			// Snapshot the previous value
			const previousTenants = queryClient.getQueryData<
				PaginatedResponse<TenantWithLeaseInfo>
			>(tenantQueries.list().queryKey)

			// Optimistically update to the new value
			queryClient.setQueryData<PaginatedResponse<TenantWithLeaseInfo>>(
				tenantQueries.list().queryKey,
				old =>
					old
						? {
								...old,
								data: old.data.filter(t => t.id !== tenant_id)
							}
						: old
			)

			return { previousTenants }
		},
		onError: (error, tenant_id, context) => {
			// Rollback on error
			if (context?.previousTenants) {
				queryClient.setQueryData(
					tenantQueries.list().queryKey,
					context.previousTenants
				)
			}
			toast.error('Failed to delete tenant')
			logger.error('Failed to delete tenant', { action: 'deleteTenant' }, error)
		},
		onSuccess: () => {
			toast.success('Tenant deleted successfully')
		},
		onSettled: () => {
			// Refetch after error or success
			queryClient.invalidateQueries({ queryKey: tenantQueries.list().queryKey })
		}
	})

	const columns: ColumnDef<TenantWithLeaseInfo>[] = useMemo(
		() => [
			{
				accessorKey: 'name',
				header: 'Tenant',
				meta: {
					label: 'Tenant Name',
					variant: 'text',
					placeholder: 'Search tenant...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="flex flex-col">
						<span className="font-medium">{row.original.name}</span>
						<span className="text-muted">{row.original.email}</span>
					</div>
				)
			},
			{
				id: 'property',
				header: 'Property',
				accessorFn: row => row.property?.name,
				meta: {
					label: 'Property',
					variant: 'text',
					placeholder: 'Search property...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => {
					const property = row.original.property
					return property?.name ? (
						<div className="flex flex-col">
							<span>{property.name}</span>
							<span className="text-muted">
								{property.city}, {property.state}
							</span>
						</div>
					) : (
						<span className="text-muted-foreground">No property assigned</span>
					)
				}
			},
			{
				accessorKey: 'paymentStatus',
				header: 'Payment Status',
				meta: {
					label: 'Payment Status',
					variant: 'select',
					options: [
						{ label: 'Current', value: 'Current' },
						{ label: 'Overdue', value: 'Overdue' },
						{ label: 'Pending', value: 'Pending' }
					]
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<Badge
						variant={
							row.original.paymentStatus === 'Overdue'
								? 'destructive'
								: row.original.paymentStatus === 'Current'
									? 'secondary'
									: 'outline'
						}
					>
						{row.original.paymentStatus}
					</Badge>
				)
			},
			{
				accessorKey: 'lease_status',
				header: 'Lease Status',
				meta: {
					label: 'Lease Status',
					variant: 'select',
					options: [
						{ label: 'Active', value: 'Active' },
						{ label: 'Pending', value: 'Pending' },
						{ label: 'Expired', value: 'Expired' }
					]
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<Badge variant="outline">{row.original.lease_status}</Badge>
				)
			},
			{
				id: 'lease',
				header: 'Lease Details',
				cell: ({ row }) => {
					const tenant = row.original
					return tenant.currentLease ? (
						<div className="flex flex-col">
							<span>#{tenant.currentLease.id.slice(0, 8)}</span>
							<span className="text-muted">
								{tenant.leaseStart
									? new Date(tenant.leaseStart).toLocaleDateString()
									: 'Start TBD'}{' '}
								-{' '}
								{tenant.leaseEnd
									? new Date(tenant.leaseEnd).toLocaleDateString()
									: 'End TBD'}
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
				meta: {
					label: 'Monthly Rent',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) =>
					row.original.monthlyRent
						? new Intl.NumberFormat('en-US', {
								style: 'currency',
								currency: 'USD'
							}).format(row.original.monthlyRent)
						: '-'
			},
			{
				id: 'actions',
				cell: ({ row }) => {
					const tenant = row.original
					return (
						<div className="flex items-center justify-end gap-1">
							<Button
								asChild
								size="sm"
								variant="ghost"
								onMouseEnter={() =>
									queryClient.prefetchQuery(tenantQueries.detail(tenant.id))
								}
							>
								<Link href={`/tenants/${tenant.id}`}>View</Link>
							</Button>
							<Button
								asChild
								size="sm"
								variant="ghost"
								onMouseEnter={() =>
									queryClient.prefetchQuery(tenantQueries.detail(tenant.id))
								}
							>
								<Link href={`/tenants/${tenant.id}/edit`}>Edit</Link>
							</Button>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										size="icon-sm"
										variant="ghost"
										className="text-destructive hover:text-destructive"
									>
										<Trash2 className="size-4" />
										<span className="sr-only">Delete tenant</span>
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete tenant</AlertDialogTitle>
										<AlertDialogDescription>
											This action cannot be undone. This will permanently delete{' '}
											<strong>{tenant.name}</strong> and remove associated
											leases and payment history.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											disabled={isDeleting}
											onClick={() => deleteTenant(tenant.id)}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											{isDeleting ? 'Deleting...' : 'Delete'}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					)
				}
			}
		],
		[queryClient, deleteTenant, isDeleting]
	)

	const { table } = useDataTable({
		data: initialTenants,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10
			}
		}
	})

	const footer = (
		<Button asChild>
			<Link href="/tenants/new">
				<UserPlus className="size-4" />
				Add Tenant
			</Link>
		</Button>
	)

	if (!initialTenants.length) {
		return (
			<CardLayout
				title="Tenants"
				description="Manage your tenants and their lease information"
				footer={footer}
			>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon" />
						<EmptyTitle>No tenants yet</EmptyTitle>
						<EmptyDescription>
							Start by creating your first tenant to manage leases and payments.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link href="/tenants/new">
								<UserPlus className="size-4" />
								Create tenant
							</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</CardLayout>
		)
	}

	return (
		<CardLayout
			title="Tenants"
			description="Track tenant status, leases, and payments"
			footer={footer}
		>
			<DataTable table={table}>
				<DataTableToolbar table={table} />
			</DataTable>
		</CardLayout>
	)
}
TenantsTable.displayName = 'TenantsTable'
