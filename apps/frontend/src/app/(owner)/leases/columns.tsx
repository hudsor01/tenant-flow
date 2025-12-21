'use client'

import { Badge } from '#components/ui/badge'
import { CheckCircle2, Clock } from 'lucide-react'
import type { LeaseWithRelations } from '@repo/shared/types/relations'
import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { LEASE_STATUS } from '#lib/constants/status-values'

// PERFORMANCE FIX: No longer needs tenant/unit maps
// Relations are now included in the lease object from backend
export function createLeaseColumns(): ColumnDef<LeaseWithRelations>[] {
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
					{ label: 'Pending Signature', value: 'pending_signature' },
					{ label: 'Active', value: 'active' },
					{ label: 'Ended', value: 'ended' },
					{ label: 'Terminated', value: 'terminated' }
				]
			},
			enableColumnFilter: true,
			cell: ({ row }) => {
				const lease = row.original
				const status = lease.lease_status

				// Show signature status badges for pending_signature leases
				if (status === LEASE_STATUS.PENDING_SIGNATURE) {
					const ownerSigned = !!lease.owner_signed_at
					const tenantSigned = !!lease.tenant_signed_at

					return (
						<div className="flex flex-col gap-1">
							<Badge variant="secondary">Pending Signature</Badge>
							<div className="flex gap-1">
								<Badge
									variant={ownerSigned ? 'default' : 'outline'}
									className={`text-xs gap-1 ${ownerSigned ? 'bg-success hover:bg-success' : ''}`}
								>
									{ownerSigned ? (
										<CheckCircle2 className="h-3 w-3" />
									) : (
										<Clock className="h-3 w-3" />
									)}
									Owner
								</Badge>
								<Badge
									variant={tenantSigned ? 'default' : 'outline'}
									className={`text-xs gap-1 ${tenantSigned ? 'bg-success hover:bg-success' : ''}`}
								>
									{tenantSigned ? (
										<CheckCircle2 className="h-3 w-3" />
									) : (
										<Clock className="h-3 w-3" />
									)}
									Tenant
								</Badge>
							</div>
						</div>
					)
				}

				return <Badge variant="outline">{status}</Badge>
			}
		},
		{
			accessorKey: 'primary_tenant_id',
			header: 'Tenant',
			meta: {
				label: 'Tenant',
				variant: 'text',
				placeholder: 'Search tenant...'
			},
			enableColumnFilter: true,
			cell: ({ row }) => {
				const lease = row.original
				// TODO: Backend should include user name in tenant relation
				const tenantId = lease.tenant?.id ?? null
				return <span>{tenantId ? `Tenant ${tenantId.slice(0, 8)}` : 'Unassigned'}</span>
			}
		},
		{
			accessorKey: 'unit_id',
			header: 'Unit',
			cell: ({ row }) => {
				const lease = row.original
				const unit = lease.unit
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
				variant: 'dateRange'
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
				unit: '$'
			},
			enableColumnFilter: true,
			cell: ({ row }) => {
				const rent = row.getValue('rent_amount') as number | null
				return rent
					? new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: 'USD'
						}).format(rent)
					: '-'
			}
		}
	]
}
