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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { memo, useCallback, type KeyboardEvent } from 'react'

interface AccessibleTenantRowProps {
	tenant: TenantWithLeaseInfo
	deleteTenant: {
		mutate: (id: string) => void
		isPending: boolean
	}
	onPrefetch: (id: string) => void
}

export const AccessibleTenantRow = memo(
	({ tenant, deleteTenant, onPrefetch }: AccessibleTenantRowProps) => {
		const handleKeyboardPrefetch = useCallback(
			(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') {
					onPrefetch(tenant.id)
				}
			},
			[onPrefetch, tenant.id]
		)

		const paymentStatusVariant =
			tenant.paymentStatus === 'Overdue'
				? 'destructive'
				: tenant.paymentStatus === 'Current'
					? 'secondary'
					: 'outline'

		return (
			<TableRow
				key={tenant.id}
				role="row"
				aria-label={`Tenant: ${tenant.name}`}
				className="focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
			>
				<TableCell role="cell">
					<div className="flex flex-col">
						<span className="font-medium" aria-label="Tenant name">
							{tenant.name}
						</span>
						<span
							className="text-sm text-muted-foreground"
							aria-label="Email address"
						>
							{tenant.email}
						</span>
					</div>
				</TableCell>
				<TableCell className="hidden xl:table-cell" role="cell">
					{tenant.property?.name ? (
						<div className="flex flex-col">
							<span aria-label="Property name">{tenant.property.name}</span>
							<span
								className="text-sm text-muted-foreground"
								aria-label="Property location"
							>
								{tenant.property.city}, {tenant.property.state}
							</span>
						</div>
					) : (
						<span
							className="text-muted-foreground"
							aria-label="No property assigned"
						>
							No property assigned
						</span>
					)}
				</TableCell>
				<TableCell role="cell">
					<div
						className="flex flex-col gap-1"
						role="group"
						aria-label="Status information"
					>
						<Badge
							variant={paymentStatusVariant}
							aria-label={`Payment status: ${tenant.paymentStatus}`}
						>
							{tenant.paymentStatus}
						</Badge>
						<Badge
							variant="outline"
							aria-label={`Lease status: ${tenant.leaseStatus}`}
						>
							{tenant.leaseStatus}
						</Badge>
					</div>
				</TableCell>
				<TableCell className="hidden lg:table-cell" role="cell">
					{tenant.currentLease ? (
						<div className="flex flex-col" aria-label="Lease information">
							<span aria-label="Lease ID">
								#{tenant.currentLease.id.slice(0, 8)}
							</span>
							<span
								className="text-sm text-muted-foreground"
								aria-label="Lease period"
							>
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
						<span
							className="text-muted-foreground"
							aria-label="No active lease"
						>
							No active lease
						</span>
					)}
				</TableCell>
				<TableCell className="hidden lg:table-cell" role="cell">
					<span
						aria-label={`Monthly rent: ${tenant.monthlyRent ? `$${tenant.monthlyRent}` : 'Not set'}`}
					>
						{tenant.monthlyRent
							? new Intl.NumberFormat('en-US', {
									style: 'currency',
									currency: 'USD'
								}).format(tenant.monthlyRent)
							: '-'}
					</span>
				</TableCell>
				<TableCell
					className="flex items-center justify-end gap-1 text-right"
					role="cell"
				>
					<div
						role="group"
						aria-label="Tenant actions"
						className="flex items-center gap-1"
					>
						<Button
							asChild
							size="sm"
							variant="ghost"
							onMouseEnter={() => onPrefetch(tenant.id)}
							onFocus={() => onPrefetch(tenant.id)}
							onKeyDown={handleKeyboardPrefetch}
							aria-label={`View details for ${tenant.name}`}
						>
							<Link
								href={`/(protected)/owner/tenants/${tenant.id}`}
								tabIndex={0}
							>
								View
							</Link>
						</Button>
						<Button
							asChild
							size="sm"
							variant="ghost"
							onMouseEnter={() => onPrefetch(tenant.id)}
							onFocus={() => onPrefetch(tenant.id)}
							onKeyDown={handleKeyboardPrefetch}
							aria-label={`Edit information for ${tenant.name}`}
						>
							<Link
								href={`/(protected)/owner/tenants/${tenant.id}/edit`}
								tabIndex={0}
							>
								Edit
							</Link>
						</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									size="icon-sm"
									variant="ghost"
									className="text-destructive hover:text-destructive focus:ring-2 focus:ring-destructive focus:ring-offset-2"
									aria-label={`Delete ${tenant.name}`}
								>
									<Trash2 className="size-4" aria-hidden="true" />
									<span className="sr-only">Delete tenant {tenant.name}</span>
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent
								role="alertdialog"
								aria-labelledby="delete-dialog-title"
								aria-describedby="delete-dialog-description"
							>
								<AlertDialogHeader>
									<AlertDialogTitle id="delete-dialog-title">
										Delete tenant
									</AlertDialogTitle>
									<AlertDialogDescription id="delete-dialog-description">
										This action cannot be undone. This will permanently delete{' '}
										<strong>{tenant.name}</strong> and remove associated leases
										and payment history.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel aria-label="Cancel deletion">
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										disabled={deleteTenant.isPending}
										onClick={() => deleteTenant.mutate(tenant.id)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-2 focus:ring-destructive focus:ring-offset-2"
										aria-label={
											deleteTenant.isPending
												? 'Deleting tenant...'
												: `Confirm delete ${tenant.name}`
										}
										aria-busy={deleteTenant.isPending}
										aria-live="polite"
									>
										{deleteTenant.isPending ? 'Deleting...' : 'Delete'}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</TableCell>
			</TableRow>
		)
	}
)
AccessibleTenantRow.displayName = 'AccessibleTenantRow'
