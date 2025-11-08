'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { Field, FieldLabel } from '#components/ui/field'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
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
import { Textarea } from '#components/ui/textarea'
import {
	useDeleteLease,
	useLeaseList,
	useRenewLease,
	useTerminateLease
} from '#hooks/api/use-lease'
import { createLogger } from '@repo/shared/lib/frontend-logger'
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
import { toast } from 'sonner'
import Link from 'next/link'

const ITEMS_PER_PAGE = 25

export default function LeasesPage() {
	const logger = createLogger({ component: 'LeasesPage' })

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
	const [renewDialogOpen, setRenewDialogOpen] = useState(false)
	const [terminateDialogOpen, setTerminateDialogOpen] = useState(false)
	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null)
	const [selectedLease, setSelectedLease] = useState<Lease | null>(null)
	const [newEndDate, setNewEndDate] = useState('')
	const [terminationReason, setTerminationReason] = useState('')

	// Fetch leases with filters and pagination
	const params: {
		search?: string
		status?: 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
		limit: number
		offset: number
	} = {
		limit: ITEMS_PER_PAGE,
		offset: (page - 1) * ITEMS_PER_PAGE
	}
	if (search) params.search = search
	if (status !== 'all')
		params.status = status as 'ACTIVE' | 'EXPIRED' | 'TERMINATED'

	const { data: leasesResponse, isLoading, error } = useLeaseList(params)

	const leases = leasesResponse?.data || []
	const total = leasesResponse?.total || 0

	// Delete mutation
	const deleteLeaseMutation = useDeleteLease({
		onSuccess: () => {
			toast.success('Lease deleted successfully')
		},
		onError: () => {
			toast.error('Failed to delete lease')
		}
	})

	// Renew mutation
	const renewLeaseMutation = useRenewLease()

	// Terminate mutation
	const terminateLeaseMutation = useTerminateLease()

	const handleDelete = (leaseId: string) => {
		if (confirm('Are you sure you want to delete this lease?')) {
			deleteLeaseMutation.mutate(leaseId)
		}
	}

	const handleRenew = (leaseId: string) => {
		setSelectedLeaseId(leaseId)
		setNewEndDate('')
		setRenewDialogOpen(true)
	}

	const handleRenewSubmit = async () => {
		if (!selectedLeaseId || !newEndDate) {
			toast.error('Please enter a new end date')
			return
		}

		try {
			await renewLeaseMutation.mutateAsync({
				id: selectedLeaseId,
				newEndDate
			})
			toast.success('Lease renewed successfully')
			setRenewDialogOpen(false)
			setSelectedLeaseId(null)
			setNewEndDate('')
		} catch (error) {
			logger.error(
				'Failed to renew lease',
				{ leaseId: selectedLeaseId ?? 'unknown' },
				error
			)
			toast.error('Failed to renew lease')
		}
	}

	const handleTerminate = (leaseId: string) => {
		setSelectedLeaseId(leaseId)
		setTerminationReason('')
		setTerminateDialogOpen(true)
	}

	const handleTerminateSubmit = async () => {
		if (!selectedLeaseId) return

		try {
			const payload: { id: string; terminationDate: string; reason?: string } =
				{
					id: selectedLeaseId,
					terminationDate: new Date().toISOString().split('T')[0]!
				}
			if (terminationReason) {
				payload.reason = terminationReason
			}
			await terminateLeaseMutation.mutateAsync(payload)
			toast.success('Lease terminated successfully')
			setTerminateDialogOpen(false)
			setSelectedLeaseId(null)
			setTerminationReason('')
		} catch (error) {
			logger.error(
				'Failed to terminate lease',
				{ leaseId: selectedLeaseId ?? 'unknown' },
				error
			)
			toast.error('Failed to terminate lease')
		}
	}

	const getStatusBadge = (status: Lease['status']) => {
		const variants: Record<
			Lease['status'],
			'default' | 'secondary' | 'destructive' | 'outline'
		> = {
			ACTIVE: 'default',
			EXPIRED: 'destructive',
			TERMINATED: 'secondary',
			DRAFT: 'outline'
		}

		return <Badge variant={variants[status]}>{status}</Badge>
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}

	if (error) {
		return (
			<main role="main" className="container py-8">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<h2 className="text-lg font-semibold text-destructive">
						Error Loading Leases
					</h2>
					<p className="text-sm text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load leases'}
					</p>
				</div>
			</main>
		)
	}

	return (
		<main role="main" className="container py-8 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Leases</h1>
					<p className="text-muted-foreground">
						Manage lease agreements and track tenant contracts
					</p>
				</div>
				<Link href="/manage/leases/new">
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
						<SelectItem value="ACTIVE">Active</SelectItem>
						<SelectItem value="EXPIRED">Expired</SelectItem>
						<SelectItem value="TERMINATED">Terminated</SelectItem>
					</SelectContent>
				</Select>

				<div className="text-sm text-muted-foreground">
					{total} lease{total !== 1 ? 's' : ''} found
				</div>
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="rounded-lg border p-8 text-center">
					<div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
					<p className="mt-2 text-sm text-muted-foreground">
						Loading leases...
					</p>
				</div>
			) : leases.length === 0 ? (
				<div className="rounded-lg border p-8 text-center">
					<FileText className="mx-auto size-12 text-muted-foreground/50" />
					<h3 className="mt-4 text-lg font-semibold">No leases found</h3>
					<p className="mt-2 text-sm text-muted-foreground">
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
										<span className="text-sm text-muted-foreground">
											{lease.tenantId ? `${lease.tenantId.substring(0, 8)}...` : 'N/A'}
										</span>
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											{lease.unitId
												? `${lease.unitId.substring(0, 8)}...`
												: 'N/A'}
										</span>
									</TableCell>
									<TableCell>{formatDate(lease.startDate)}</TableCell>
									<TableCell>{lease.endDate ? formatDate(lease.endDate) : 'Month-to-Month'}</TableCell>
									<TableCell>${lease.rentAmount.toLocaleString()}</TableCell>
									<TableCell>
										${lease.securityDeposit.toLocaleString()}
									</TableCell>
									<TableCell>{getStatusBadge(lease.status)}</TableCell>
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
														setEditDialogOpen(true)
													}}
												>
													<Edit className="mr-2 size-4" />
													Edit Lease
												</DropdownMenuItem>
												{lease.status === 'ACTIVE' && (
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

			{/* Renew Lease Dialog */}
			<Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Renew Lease</DialogTitle>
						<DialogDescription>
							Extend the lease by setting a new end date
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor="newEndDate">New End Date</FieldLabel>
						<Input
							id="newEndDate"
							type="date"
							value={newEndDate}
							onChange={e => setNewEndDate(e.target.value)}
						/>
					</Field>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleRenewSubmit}
							disabled={renewLeaseMutation.isPending}
						>
							{renewLeaseMutation.isPending ? 'Renewing...' : 'Renew Lease'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Terminate Lease Dialog */}
			<Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Terminate Lease</DialogTitle>
						<DialogDescription>
							End this lease early. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor="terminationReason">
							Reason (Optional)
						</FieldLabel>
						<Textarea
							id="terminationReason"
							placeholder="Reason for early termination..."
							value={terminationReason}
							onChange={e => setTerminationReason(e.target.value)}
							rows={3}
						/>
					</Field>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setTerminateDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleTerminateSubmit}
							disabled={terminateLeaseMutation.isPending}
						>
							{terminateLeaseMutation.isPending
								? 'Terminating...'
								: 'Terminate Lease'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Lease Dialog - Inline (read-only for now, backend handles updates) */}
			{selectedLease && (
				<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
					<DialogContent className="sm:max-w-lg">
						<DialogHeader>
							<DialogTitle>Lease Details</DialogTitle>
							<DialogDescription>View lease information</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label>Start Date</Label>
								<Input type="date" value={selectedLease.startDate} disabled />
							</div>
							<div>
								<Label>End Date</Label>
								<Input type="date" value={selectedLease.endDate || ''} disabled />
							</div>
							<div>
								<Label>Rent Amount</Label>
								<Input
									type="number"
									value={selectedLease.rentAmount}
									disabled
								/>
							</div>
							<div>
								<Label>Security Deposit</Label>
								<Input
									type="number"
									value={selectedLease.securityDeposit}
									disabled
								/>
							</div>
							<div>
								<Label>Status</Label>
								<Badge>{selectedLease.status}</Badge>
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setEditDialogOpen(false)}
							>
								Close
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</main>
	)
}
