'use client'

import { Fragment } from 'react'

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
import { Input } from '#components/ui/input'
import {
	Pagination,
	PaginationContent,
	PaginationItem
} from '#components/ui/pagination'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import {
	useDeleteLeaseMutation
} from '#hooks/api/mutations/lease-mutations'
import { useLeaseList } from '#hooks/api/use-lease'
import { formatDate } from '#lib/formatters/date'
import type { Lease } from '@repo/shared/types/core'
import {
	Edit,
	FileText,
	MoreVertical,
	RefreshCw,
	Search,
	Trash2,
	X
} from 'lucide-react'
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import Link from 'next/link'
import { RenewLeaseDialog } from '#components/leases/renew-lease-dialog'
import { TerminateLeaseDialog } from '#components/leases/terminate-lease-dialog'
import { ConfirmDialog } from '#components/ui/confirm-dialog'
import { useModalStore } from '#stores/modal-store'

const ITEMS_PER_PAGE = 25

export default function LeasesPage() {
	// nuqs: Type-safe URL state with automatic batching and clean URLs
	const [{ page, search, status }, setUrlState] = useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			search: parseAsString.withDefault(''),
			status: parseAsString.withDefault('all')
		},
		{
			history: 'push',
			scroll: false,
			shallow: true,
			throttleMs: 200,
			clearOnDefault: true
		}
	)
	const [_selectedLease, setSelectedLease] = useState<Lease | null>(null)
	const { openModal } = useModalStore()

	// Fetch leases with filters and pagination
	// NOTE: Database uses lowercase status values: 'active', 'expired', 'terminated'
	const params: {
		search?: string
		status?: 'active' | 'expired' | 'terminated'
		limit: number
		offset: number
	} = {
		limit: ITEMS_PER_PAGE,
		offset: (page - 1) * ITEMS_PER_PAGE
	}
	if (search) params.search = search
	if (status !== 'all')
		params.status = status as 'active' | 'expired' | 'terminated'

	const { data: leasesResponse, isLoading, error } = useLeaseList(params)

	const leases = leasesResponse?.data || []
	const total = leasesResponse?.total || 0

	// Delete mutation
	const deleteLeaseMutation = useDeleteLeaseMutation()

	const handleRenew = (lease_id: string) => {
		openModal(`renew-lease-${lease_id}`)
	}

	const handleTerminate = (lease_id: string) => {
		openModal(`terminate-lease-${lease_id}`)
	}

	const handleDelete = (lease_id: string) => {
		openModal(`delete-lease-${lease_id}`)
	}

	const getStatusBadge = (status: string) => {
		// Database uses lowercase status values
		const variants: Record<
			string,
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			active: 'default',
			expired: 'destructive',
			terminated: 'secondary',
			draft: 'outline'
		}

		// Capitalize first letter for display
		const displayStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
		return <Badge variant={variants[status.toLowerCase()] || 'outline'}>{displayStatus}</Badge>
	}

	if (error) {
		return (
			<div className="container py-8">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<h2 className="typography-large text-destructive">
						Error Loading Leases
					</h2>
					<p className="text-muted">
						{error instanceof Error ? error.message : 'Failed to load leases'}
					</p>
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

			{/* Filters */}
			<div className="flex items-center gap-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 translate-y-[-50%] size-4 text-muted-foreground" />
					<Input
						placeholder="Search leases..."
						value={search}
						onChange={e => {
							setUrlState({ search: e.target.value, page: 1 })
						}}
						className="pl-9"
					/>
				</div>

				<Select
					value={status}
					onValueChange={newStatus => {
						setUrlState({ status: newStatus, page: 1 })
					}}
				>
					<SelectTrigger className="w-45">
						<SelectValue placeholder="Filter by status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="active">Active</SelectItem>
						<SelectItem value="expired">Expired</SelectItem>
						<SelectItem value="terminated">Terminated</SelectItem>
					</SelectContent>
				</Select>

				<div className="text-muted">
					{total} lease{total !== 1 ? 's' : ''} found
				</div>
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="rounded-lg border p-8 text-center">
					<div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
					<p className="mt-2 text-muted">
						Loading leases...
					</p>
				</div>
			) : leases.length === 0 ? (
				<div className="rounded-lg border p-8 text-center">
					<FileText className="mx-auto size-12 text-muted-foreground/50" />
					<h3 className="mt-4 typography-large">No leases found</h3>
					<p className="mt-2 text-muted">
						{search || status !== 'all'
							? 'Try adjusting your filters'
							: 'Get started by creating your first lease'}
					</p>
				</div>
			) : (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Tenant</TableHead>
								<TableHead>Unit</TableHead>
								<TableHead>Start Date</TableHead>
								<TableHead>End Date</TableHead>
								<TableHead>Rent Amount</TableHead>
								<TableHead>Deposit</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-16">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leases.map(lease => (
								<TableRow key={lease.id}>
									<TableCell>
										<span className="text-muted">
											{lease?.primary_tenant_id ?? ''
												? `${lease?.primary_tenant_id ?? ''.substring(0, 8)}...`
												: 'N/A'}
										</span>
									</TableCell>
									<TableCell>
										<span className="text-muted">
											{lease.unit_id
												? `${lease.unit_id.substring(0, 8)}...`
												: 'N/A'}
										</span>
									</TableCell>
									<TableCell>{formatDate(lease.start_date)}</TableCell>
									<TableCell>
										{lease.end_date
											? formatDate(lease.end_date)
											: 'Month-to-Month'}
									</TableCell>
									<TableCell>${lease.rent_amount.toLocaleString()}</TableCell>
									<TableCell>
										${lease.security_deposit.toLocaleString()}
									</TableCell>
									<TableCell>{getStatusBadge(lease.lease_status)}</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreVertical className="size-4" />
													<span className="sr-only">Open menu</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuLabel>Actions</DropdownMenuLabel>
												<DropdownMenuItem
													onClick={() => {
														setSelectedLease(lease)
														openModal(`edit-lease-${lease.id}`)
													}}
												>
													<Edit className="mr-2 size-4" />
													Edit Lease
												</DropdownMenuItem>
												{lease.lease_status === 'active' && (
													<>
														<DropdownMenuItem
															onClick={() => handleRenew(lease.id)}
														>
															<RefreshCw className="mr-2 size-4" />
															Renew Lease
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => handleTerminate(lease.id)}
														>
															<X className="mr-2 size-4" />
															Terminate Lease
														</DropdownMenuItem>
													</>
												)}
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => handleDelete(lease.id)}
													className="text-destructive focus:text-destructive"
												>
													<Trash2 className="mr-2 size-4" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Pagination */}
			{!isLoading && total > ITEMS_PER_PAGE && (
				<div className="mt-4">
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<Button
									variant="outline"
									onClick={e => {
										e.preventDefault()
										if (page > 1) {
											setUrlState({ page: page - 1 })
										}
									}}
									className={page === 1 ? 'pointer-events-none opacity-50' : ''}
								>
									Previous
								</Button>
							</PaginationItem>

							{Array.from(
								{ length: Math.ceil(total / ITEMS_PER_PAGE) },
								(_, i) => i + 1
							)
								.filter(
									pageNum =>
										pageNum === 1 ||
										pageNum === Math.ceil(total / ITEMS_PER_PAGE) ||
										(pageNum >= page - 1 && pageNum <= page + 1)
								)
								.map((pageNum, idx, arr) => (
									<PaginationItem key={pageNum}>
										{idx > 0 && arr[idx - 1] !== pageNum - 1 ? (
											<span className="px-2">...</span>
										) : null}
										<Button
											variant={page === pageNum ? 'default' : 'outline'}
											onClick={e => {
												e.preventDefault()
												setUrlState({ page: pageNum })
											}}
										>
											{pageNum}
										</Button>
									</PaginationItem>
								))}

							<PaginationItem>
								<Button
									variant="outline"
									onClick={e => {
										e.preventDefault()
										if (page < Math.ceil(total / ITEMS_PER_PAGE)) {
											setUrlState({ page: page + 1 })
										}
									}}
									className={
										page === Math.ceil(total / ITEMS_PER_PAGE)
											? 'pointer-events-none opacity-50'
											: ''
									}
								>
									Next
								</Button>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}

			{/* Lease Dialogs */}
			{leases.map(lease => (
				<Fragment key={lease.id}>
					<RenewLeaseDialog lease_id={lease.id} />
					<TerminateLeaseDialog lease_id={lease.id} />
					<ConfirmDialog
						modalId={`delete-lease-${lease.id}`}
						title="Delete Lease"
						description={`Are you sure you want to delete this lease? This action cannot be undone and will permanently remove the lease agreement.`}
						confirmText="Delete Lease"
						onConfirm={() => deleteLeaseMutation.mutate(lease.id)}
						loading={deleteLeaseMutation.isPending}
					/>
				</Fragment>
			))}
		</div>
	)
}
