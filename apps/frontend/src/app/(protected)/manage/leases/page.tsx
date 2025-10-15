'use client'

import { LeaseEditDialog } from '@/components/leases/lease-edit-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious
} from '@/components/ui/pagination'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
	useDeleteLease,
	useLeaseList,
	useRenewLease,
	useTerminateLease
} from '@/hooks/api/use-lease'
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CreateLeaseDialog } from './create-dialog'

const ITEMS_PER_PAGE = 25

export default function LeasesPage() {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const logger = createLogger({ component: 'LeasesPage' })

	// Get URL params with defaults
	const pageParam = Number(searchParams.get('page')) || 1
	const searchParam = searchParams.get('search') || ''
	const statusParam = searchParams.get('status') || 'all'

	// Local state synced with URL
	const [page, setPage] = useState(pageParam)
	const [search, setSearch] = useState(searchParam)
	const [statusFilter, setStatusFilter] = useState<string>(statusParam)

	// Sync local state with URL params on mount/navigation
	useEffect(() => {
		setPage(pageParam)
		setSearch(searchParam)
		setStatusFilter(statusParam)
	}, [pageParam, searchParam, statusParam])

	// Update URL when filters change
	const updateURL = (updates: {
		page?: number
		search?: string
		status?: string
	}) => {
		const params = new URLSearchParams(searchParams.toString())

		if (updates.page !== undefined) {
			if (updates.page === 1) {
				params.delete('page')
			} else {
				params.set('page', updates.page.toString())
			}
		}

		if (updates.search !== undefined) {
			if (updates.search === '') {
				params.delete('search')
			} else {
				params.set('search', updates.search)
			}
		}

		if (updates.status !== undefined) {
			if (updates.status === 'all') {
				params.delete('status')
			} else {
				params.set('status', updates.status)
			}
		}

		const newURL = params.toString()
			? `${pathname}?${params.toString()}`
			: pathname
		router.push(newURL, { scroll: false })
	}
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
	if (statusFilter !== 'all')
		params.status = statusFilter as 'ACTIVE' | 'EXPIRED' | 'TERMINATED'

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
					terminationDate: new Date().toISOString().split('T')[0]! // Today's date in YYYY-MM-DD format
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
			<div className="container py-8">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
					<h2 className="text-lg font-semibold text-destructive">
						Error Loading Leases
					</h2>
					<p className="text-sm text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load leases'}
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="container py-8 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<FileText className="w-8 h-8" />
						Leases
					</h1>
					<p className="text-muted-foreground">
						Manage lease agreements and track tenant contracts
					</p>
				</div>
				<CreateLeaseDialog />
			</div>

			{/* Filters */}
			<div className="flex items-center gap-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search leases..."
						value={search}
						onChange={e => {
							const newSearch = e.target.value
							setSearch(newSearch)
							updateURL({ search: newSearch, page: 1 }) // Reset to page 1 on search
						}}
						className="pl-9"
					/>
				</div>

				<Select
					value={statusFilter}
					onValueChange={newStatus => {
						setStatusFilter(newStatus)
						updateURL({ status: newStatus, page: 1 }) // Reset to page 1 on filter change
					}}
				>
					<SelectTrigger className="w-[180px]">
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
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
					<p className="mt-2 text-sm text-muted-foreground">
						Loading leases...
					</p>
				</div>
			) : leases.length === 0 ? (
				<div className="rounded-lg border p-8 text-center">
					<FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
					<h3 className="mt-4 text-lg font-semibold">No leases found</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						{search || statusFilter !== 'all'
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
								<TableHead className="w-[70px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{leases.map(lease => (
								<TableRow key={lease.id}>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											{lease.tenantId.substring(0, 8)}...
										</span>
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											{lease.unitId.substring(0, 8)}...
										</span>
									</TableCell>
									<TableCell>{formatDate(lease.startDate)}</TableCell>
									<TableCell>{formatDate(lease.endDate)}</TableCell>
									<TableCell>${lease.rentAmount.toLocaleString()}</TableCell>
									<TableCell>
										${lease.securityDeposit.toLocaleString()}
									</TableCell>
									<TableCell>{getStatusBadge(lease.status)}</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreVertical className="h-4 w-4" />
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
													<Edit className="mr-2 h-4 w-4" />
													Edit Lease
												</DropdownMenuItem>
												{lease.status === 'ACTIVE' && (
													<>
														<DropdownMenuItem
															onClick={() => handleRenew(lease.id)}
														>
															<RefreshCw className="mr-2 h-4 w-4" />
															Renew Lease
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => handleTerminate(lease.id)}
														>
															<X className="mr-2 h-4 w-4" />
															Terminate Lease
														</DropdownMenuItem>
													</>
												)}
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => handleDelete(lease.id)}
													className="text-destructive focus:text-destructive"
												>
													<Trash2 className="mr-2 h-4 w-4" />
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
								<PaginationPrevious
									href="#"
									onClick={e => {
										e.preventDefault()
										if (page > 1) {
											const newPage = page - 1
											setPage(newPage)
											updateURL({ page: newPage })
										}
									}}
									className={page === 1 ? 'pointer-events-none opacity-50' : ''}
								/>
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
										<PaginationLink
											href="#"
											onClick={e => {
												e.preventDefault()
												setPage(pageNum)
												updateURL({ page: pageNum })
											}}
											isActive={page === pageNum}
										>
											{pageNum}
										</PaginationLink>
									</PaginationItem>
								))}

							<PaginationItem>
								<PaginationNext
									href="#"
									onClick={e => {
										e.preventDefault()
										if (page < Math.ceil(total / ITEMS_PER_PAGE)) {
											const newPage = page + 1
											setPage(newPage)
											updateURL({ page: newPage })
										}
									}}
									className={
										page === Math.ceil(total / ITEMS_PER_PAGE)
											? 'pointer-events-none opacity-50'
											: ''
									}
								/>
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

			{/* Edit Lease Dialog */}
			{selectedLease && (
				<LeaseEditDialog
					lease={selectedLease}
					open={editDialogOpen}
					onOpenChange={setEditDialogOpen}
				/>
			)}
		</div>
	)
}
