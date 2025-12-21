'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import {
	useDeleteLeaseMutation
} from '#hooks/api/mutations/lease-mutations'
import { useLeaseList } from '#hooks/api/use-lease'
import { useDataTable } from '#hooks/use-data-table'
import { formatDate } from '#lib/formatters/date'
import type { Lease } from '@repo/shared/types/core'
import type { ColumnDef } from '@tanstack/react-table'
import {
	Edit,
	FileText,
	MoreVertical,
	RefreshCw,
	Trash2,
	X
} from 'lucide-react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { RenewLeaseDialog } from '#components/leases/renew-lease-dialog'
import { TerminateLeaseDialog } from '#components/leases/terminate-lease-dialog'
import { ConfirmDialog } from '#components/ui/confirm-dialog'

const ITEMS_PER_PAGE = 25

export default function LeasesPage() {
	const [selectedLease, setSelectedLease] = useState<Lease | null>(null)
	const [showRenewDialog, setShowRenewDialog] = useState(false)
	const [showTerminateDialog, setShowTerminateDialog] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)

	// Fetch all leases for client-side filtering
	// Note: For large datasets, switch to server-side filtering
	const { data: leasesResponse, isLoading, error } = useLeaseList({
		limit: 1000,
		offset: 0
	})

	const leases = leasesResponse?.data || []

	// Delete mutation
	const deleteLeaseMutation = useDeleteLeaseMutation()

	const handleRenew = (lease: Lease) => {
		setSelectedLease(lease)
		setShowRenewDialog(true)
	}

	const handleTerminate = (lease: Lease) => {
		setSelectedLease(lease)
		setShowTerminateDialog(true)
	}

	const handleDelete = (lease: Lease) => {
		setSelectedLease(lease)
		setShowDeleteDialog(true)
	}

	const getStatusBadge = (status: string) => {
		const variants: Record<
			string,
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			active: 'default',
			expired: 'destructive',
			terminated: 'secondary',
			draft: 'outline',
			pending_signature: 'outline'
		}

		// Capitalize for display
		const displayStatus = status
			.split('_')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')

		return <Badge variant={variants[status.toLowerCase()] || 'outline'}>{displayStatus}</Badge>
	}

	const columns: ColumnDef<Lease>[] = useMemo(() => [
		{
			accessorKey: 'primary_tenant_id',
			header: 'Tenant',
			meta: {
				label: 'Tenant ID',
				variant: 'text',
				placeholder: 'Search tenant...'
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.primary_tenant_id
						? `${row.original.primary_tenant_id.substring(0, 8)}...`
						: 'N/A'}
				</span>
			)
		},
		{
			accessorKey: 'unit_id',
			header: 'Unit',
			meta: {
				label: 'Unit ID',
				variant: 'text',
				placeholder: 'Search unit...'
			},
			enableColumnFilter: true,
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.unit_id
						? `${row.original.unit_id.substring(0, 8)}...`
						: 'N/A'}
				</span>
			)
		},
		{
			accessorKey: 'start_date',
			header: 'Start Date',
			cell: ({ row }) => formatDate(row.original.start_date)
		},
		{
			accessorKey: 'end_date',
			header: 'End Date',
			cell: ({ row }) =>
				row.original.end_date
					? formatDate(row.original.end_date)
					: 'Month-to-Month'
		},
		{
			accessorKey: 'rent_amount',
			header: 'Rent Amount',
			meta: {
				label: 'Rent Amount',
				variant: 'number'
			},
			enableColumnFilter: true,
			cell: ({ row }) => `$${row.original.rent_amount.toLocaleString()}`
		},
		{
			accessorKey: 'security_deposit',
			header: 'Deposit',
			meta: {
				label: 'Security Deposit',
				variant: 'number'
			},
			enableColumnFilter: true,
			cell: ({ row }) => `$${row.original.security_deposit.toLocaleString()}`
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
					{ label: 'Expired', value: 'expired' },
					{ label: 'Terminated', value: 'terminated' }
				]
			},
			enableColumnFilter: true,
			cell: ({ row }) => getStatusBadge(row.original.lease_status)
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const lease = row.original
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreVertical className="size-4" />
								<span className="sr-only">Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem asChild>
								<Link href={`/leases/${lease.id}/edit`}>
									<Edit className="mr-2 size-4" />
									Edit Lease
								</Link>
							</DropdownMenuItem>
							{lease.lease_status === 'active' && (
								<>
									<DropdownMenuItem onClick={() => handleRenew(lease)}>
										<RefreshCw className="mr-2 size-4" />
										Renew Lease
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => handleTerminate(lease)}>
										<X className="mr-2 size-4" />
										Terminate Lease
									</DropdownMenuItem>
								</>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => handleDelete(lease)}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="mr-2 size-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)
			}
		}
	], [])

	const { table } = useDataTable({
		data: leases,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: ITEMS_PER_PAGE
			}
		}
	})

	if (error) {
		return (
			<div className="container py-8">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<h2 className="typography-large text-destructive">
						Error Loading Leases
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load leases'}
					</p>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="container py-8">
				<div className="rounded-lg border p-8 text-center">
					<div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
					<p className="mt-2 text-muted-foreground">Loading leases...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="container py-8 space-y-6">
			{/* Header */}
			<div className="flex-between">
				<div>
					<h1 className="typography-h2 tracking-tight">Leases</h1>
					<p className="text-muted-foreground">
						Manage lease agreements and track tenant contracts
					</p>
				</div>
				<Link href="/leases/new">
					<Button>Add Lease</Button>
				</Link>
			</div>

			{/* DataTable with Toolbar */}
			{leases.length === 0 ? (
				<div className="rounded-lg border p-8 text-center">
					<FileText className="mx-auto size-12 text-muted-foreground/50" />
					<h3 className="mt-4 typography-large">No leases found</h3>
					<p className="mt-2 text-muted-foreground">
						Get started by creating your first lease
					</p>
				</div>
			) : (
				<DataTable table={table}>
					<DataTableToolbar table={table} />
				</DataTable>
			)}

			{/* Lease Dialogs */}
			{selectedLease && (
				<>
					<RenewLeaseDialog
						open={showRenewDialog}
						onOpenChange={setShowRenewDialog}
						lease={selectedLease}
						onSuccess={() => {
							setShowRenewDialog(false)
							setSelectedLease(null)
						}}
					/>
					<TerminateLeaseDialog
						open={showTerminateDialog}
						onOpenChange={setShowTerminateDialog}
						lease={selectedLease}
						onSuccess={() => {
							setShowTerminateDialog(false)
							setSelectedLease(null)
						}}
					/>
					<ConfirmDialog
						open={showDeleteDialog}
						onOpenChange={setShowDeleteDialog}
						title="Delete Lease"
						description="Are you sure you want to delete this lease? This action cannot be undone and will permanently remove the lease agreement."
						confirmText="Delete Lease"
						onConfirm={() => {
							deleteLeaseMutation.mutate(selectedLease.id)
							setShowDeleteDialog(false)
							setSelectedLease(null)
						}}
						loading={deleteLeaseMutation.isPending}
					/>
				</>
			)}
		</div>
	)
}
