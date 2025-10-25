"use client"

import { InviteTenantDialog } from '@/components/tenants/invite-tenant-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { ColumnDef } from '@tanstack/react-table'
import { Mail } from 'lucide-react'
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
			const invitationStatus = tenant.invitation_status

			// Helper function to get invitation badge variant
			const getInvitationVariant = (status: string | null) => {
				switch (status) {
					case 'PENDING':
					case 'SENT':
						return 'default'
					case 'ACCEPTED':
						return 'secondary'
					case 'EXPIRED':
					case 'REVOKED':
						return 'destructive'
					default:
						return 'outline'
				}
			}

			return (
				<div className="flex flex-col gap-1">
					{/* Invitation Status Badge */}
					{invitationStatus && (
						<Badge variant={getInvitationVariant(invitationStatus)}>
							{invitationStatus}
						</Badge>
					)}
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
		id: 'invitation',
		header: 'Portal Access',
		cell: ({ row }) => {
			const tenant = row.original
			const invitationStatus = tenant.invitation_status

			// No invitation sent yet - show "Invite to Portal" button
			if (!invitationStatus || invitationStatus === null) {
				// Build props object with only defined values (exactOptionalPropertyTypes compliance)
				const dialogProps: {
					tenantId: string
					tenantEmail: string
					tenantName: string
					propertyId?: string
					leaseId?: string
				} = {
					tenantId: tenant.id,
					tenantEmail: tenant.email,
					tenantName: tenant.name
				}
				if (tenant.property?.id) dialogProps.propertyId = tenant.property.id
				if (tenant.currentLease?.id) dialogProps.leaseId = tenant.currentLease.id

				return <InviteTenantDialog {...dialogProps} />
			}

			// Invitation already sent - show "Resend" button for PENDING, SENT, or EXPIRED
			const canResend = ['PENDING', 'SENT', 'EXPIRED'].includes(invitationStatus)
			
			if (canResend) {
				return (
					<Button
						variant="ghost"
						size="sm"
						onClick={(e) => {
							e.preventDefault()
							// Dispatch event for TenantsTableClient to handle
							const event = new CustomEvent('resend-invitation', {
								detail: { tenantId: tenant.id }
							})
							window.dispatchEvent(event)
						}}
					>
						<Mail className="size-4 mr-2" />
						Resend
					</Button>
				)
			}

			// Invitation accepted - show badge
			if (invitationStatus === 'ACCEPTED') {
				return (
					<Badge variant="secondary" className="gap-1">
						<Mail className="size-3" />
						Active
					</Badge>
				)
			}

			// Revoked - show revoked badge
			if (invitationStatus === 'REVOKED') {
				return (
					<Badge variant="destructive" className="gap-1">
						Revoked
					</Badge>
				)
			}

			return null
		}
	}
]
