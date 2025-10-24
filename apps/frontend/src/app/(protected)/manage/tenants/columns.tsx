"use client"

import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'

export const columns: ColumnDef<TenantWithLeaseInfo>[] = [
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
