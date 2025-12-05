'use client'

import { Badge } from '#components/ui/badge'
import type { Lease, Unit } from '@repo/shared/types/core'
import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'

interface ColumnOptions {
	tenantMap: Map<string, string>
	unitMap: Map<string, Unit>
}

export function createLeaseColumns({ tenantMap, unitMap }: ColumnOptions): ColumnDef<Lease>[] {
	return [
		{
			accessorKey: 'id',
			header: 'Lease',
			cell: ({ row }) => {
				const lease = row.original
				return (
					<Link href={`/leases/${lease.id}`} className="hover:underline">
						<div className="flex flex-col gap-1">
							<span className="font-medium">#{lease.id.slice(0, 8)}</span>
							<Badge variant="outline">{lease.lease_status}</Badge>
						</div>
					</Link>
				)
			}
		},
		{
			accessorKey: 'lease_status',
			header: 'Status',
			meta: {
				label: 'Status',
				variant: 'select',
				options: [
					{ label: 'Draft', value: 'draft' },
					{ label: 'Pending', value: 'pending' },
					{ label: 'Active', value: 'active' },
					{ label: 'Expired', value: 'expired' },
					{ label: 'Terminated', value: 'terminated' },
				],
			},
			enableColumnFilter: true,
			cell: ({ row }) => {
				const status = row.getValue('lease_status') as string
				return <Badge variant="outline">{status}</Badge>
			}
		},
		{
			accessorKey: 'primary_tenant_id',
			header: 'Tenant',
			meta: {
				label: 'Tenant',
				variant: 'text',
				placeholder: 'Search tenant...',
			},
			enableColumnFilter: true,
			cell: ({ row }) => {
				const lease = row.original
				const tenantName = lease.primary_tenant_id
					? tenantMap.get(lease.primary_tenant_id) ?? 'Unknown'
					: 'Unassigned'
				return <span>{tenantName}</span>
			}
		},
		{
			accessorKey: 'unit_id',
			header: 'Unit',
			cell: ({ row }) => {
				const lease = row.original
				const unit = lease.unit_id ? unitMap.get(lease.unit_id) : null
				return unit ? (
					<div className="flex flex-col">
						<span className="font-medium">Unit {unit.unit_number}</span>
						<span className="text-sm text-muted-foreground">
							{unit.bedrooms} bd · {unit.bathrooms} ba
						</span>
					</div>
				) : (
					<span className="text-muted-foreground">No unit</span>
				)
			}
		},
		{
			accessorKey: 'start_date',
			header: 'Term',
			meta: {
				label: 'Start Date',
				variant: 'dateRange',
			},
			enableColumnFilter: true,
			cell: ({ row }) => {
				const lease = row.original
				const startDate = lease.start_date
					? new Date(lease.start_date).toLocaleDateString()
					: 'Start TBD'
				const endDate = lease.end_date
					? new Date(lease.end_date).toLocaleDateString()
					: 'End TBD'
				return (
					<div className="flex flex-col">
						<span>{startDate}</span>
						<span className="text-sm text-muted-foreground">{endDate}</span>
					</div>
				)
			}
		},
		{
			accessorKey: 'rent_amount',
			header: 'Rent',
			meta: {
				label: 'Rent',
				variant: 'range',
				range: [0, 10000],
				unit: '$',
			},
			enableColumnFilter: true,
			cell: ({ row }) => {
				const rent = row.getValue('rent_amount') as number | null
				return rent
					? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rent)
					: '-'
			}
		}
	]
}
