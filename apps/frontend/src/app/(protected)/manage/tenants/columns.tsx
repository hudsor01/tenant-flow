"use client"

import { InviteTenantDialog } from '#components/tenants/invite-tenant-dialog'
import { Badge } from '#components/ui/badge'
import { TenantPaymentsDialog } from './tenant-payments-dialog'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'

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
		accessorKey: 'properties',
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
					{/* Payment Status Badge */}
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
					{/* Lease Status Badge */}
					<Badge variant="outline">{tenant.lease_status}</Badge>
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
		accessorKey: 'rent_amount',
		header: 'Monthly Rent',
		cell: ({ row }) => {
			const rent = row.getValue('rent_amount') as number | null
			return rent ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rent) : '-'
		}
	},
	{
		id: 'invitation',
		header: 'Portal Access',
		cell: ({ row }) => {
			const tenant = row.original

			// Build props object with only defined values (exactOptionalPropertyTypes compliance)
			const dialogProps: {
				tenant_id: string
				tenantEmail: string
				tenantName: string
				property_id?: string
				lease_id?: string
			} = {
				tenant_id: tenant.id,
				tenantEmail: tenant.email ?? '',
				tenantName: tenant.name ?? ''
			}
			if (tenant.property?.id) dialogProps.property_id = tenant.property.id
			if (tenant.currentLease?.id) dialogProps.lease_id = tenant.currentLease.id

			return <InviteTenantDialog {...dialogProps} />
		}
	},
	{
		id: 'payments',
		header: 'Payments',
		cell: ({ row }) => {
			const tenant = row.original
			return <TenantPaymentsDialog tenant_id={tenant.id} tenantName={tenant.name ?? ''} />
		}
	}
]
