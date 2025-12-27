'use client'

import { useState, useEffect, useMemo } from 'react'
import {
	FileText,
	Search,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Pencil,
	Check,
	ArrowUpDown,
	Clock,
	AlertTriangle,
	Plus,
	Eye,
	RefreshCw,
	X
} from 'lucide-react'
import { useLeaseList } from '#hooks/api/use-lease'
import { useDeleteLeaseMutation } from '#hooks/api/mutations/lease-mutations'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '#components/ui/skeleton'
import { RenewLeaseDialog } from '#components/leases/renew-lease-dialog'
import { TerminateLeaseDialog } from '#components/leases/terminate-lease-dialog'
import { ConfirmDialog } from '#components/ui/confirm-dialog'
import type { Lease, Tenant, Unit, Property, User } from '@repo/shared/types/core'

/** Extended user type that may include computed fields from API response */
interface UserWithExtras extends User {
	name?: string
}

/** Extended tenant type that may include nested user info from API response */
interface TenantWithUser extends Tenant {
	user?: UserWithExtras
	User?: UserWithExtras
	name?: string
	// The API may return flattened user fields on the tenant object
	first_name?: string | null
	last_name?: string | null
}

/** Extended unit type that includes property relation */
interface UnitWithProperty extends Unit {
	property?: Property
}

/** Lease type with relations as returned by the API */
interface LeaseWithNestedRelations extends Lease {
	tenant?: TenantWithUser
	unit?: UnitWithProperty
}

function formatDate(dateString: string | null): string {
	if (!dateString) return 'N/A'
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

function getStatusBadge(status: string) {
	const config: Record<string, { className: string; label: string }> = {
		draft: {
			className: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Draft'
		},
		pending_signature: {
			className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			label: 'Pending'
		},
		active: {
			className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			label: 'Active'
		},
		ended: {
			className: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Ended'
		},
		terminated: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			label: 'Terminated'
		},
		expiring: {
			className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
			label: 'Expiring'
		}
	}

	const defaultConfig = { className: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400', label: 'Draft' }
	const statusConfig = config[status] ?? defaultConfig

	return (
		<span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${statusConfig.className}`}>
			{statusConfig.label}
		</span>
	)
}

type SortField = 'tenant' | 'property' | 'startDate' | 'endDate' | 'rent' | 'status'
type SortDirection = 'asc' | 'desc'

// Transform lease data to display format
interface LeaseDisplay {
	id: string
	tenantName: string
	propertyName: string
	unitNumber: string
	status: string
	startDate: string
	endDate: string
	rentAmount: number
	original: Lease
}

function transformLease(lease: LeaseWithNestedRelations): LeaseDisplay {
	const tenant = lease.tenant
	const unit = lease.unit

	// Extract tenant name
	const tenantUser = tenant?.user ?? tenant?.User
	const tenantName =
		tenant?.name ||
		(tenant?.first_name || tenant?.last_name
			? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
			: null) ||
		tenantUser?.full_name ||
		tenantUser?.name ||
		(tenantUser?.first_name || tenantUser?.last_name
			? `${tenantUser?.first_name ?? ''} ${tenantUser?.last_name ?? ''}`.trim()
			: null) ||
		'Unassigned'

	// Check if lease is expiring (within 30 days)
	const endDate = lease.end_date ? new Date(lease.end_date) : null
	const now = new Date()
	const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
	const isExpiring = endDate && endDate <= thirtyDaysFromNow && endDate > now && lease.lease_status === 'active'

	return {
		id: lease.id,
		tenantName,
		propertyName: unit?.property?.name || unit?.property?.address_line1 || 'No Property',
		unitNumber: unit?.unit_number || 'N/A',
		status: isExpiring ? 'expiring' : lease.lease_status,
		startDate: lease.start_date || '',
		endDate: lease.end_date || '',
		rentAmount: lease.rent_amount || 0,
		original: lease
	}
}

function LeasesPageSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header Skeleton */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-8 w-32 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>

			{/* Stats Skeleton */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				{[1, 2, 3, 4].map(i => (
					<div key={i} className="bg-card border border-border rounded-sm p-4">
						<Skeleton className="h-4 w-24 mb-2" />
						<div className="flex items-end justify-between">
							<Skeleton className="h-8 w-12" />
							<Skeleton className="h-9 w-9 rounded-sm" />
						</div>
					</div>
				))}
			</div>

			{/* Table Skeleton */}
			<div className="bg-card border border-border rounded-sm overflow-hidden">
				<div className="px-4 py-3 border-b border-border flex items-center gap-3">
					<Skeleton className="h-9 flex-1 max-w-sm" />
					<Skeleton className="h-9 w-32" />
				</div>
				<div className="divide-y divide-border">
					{[1, 2, 3, 4, 5].map(i => (
						<div key={i} className="px-4 py-3 flex items-center gap-4">
							<Skeleton className="h-4 w-4" />
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-5 w-40 hidden lg:block" />
							<Skeleton className="h-6 w-16" />
							<div className="ml-auto flex gap-1">
								<Skeleton className="h-8 w-8" />
								<Skeleton className="h-8 w-8" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export default function LeasesPage() {
	const router = useRouter()
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [sortField, setSortField] = useState<SortField>('endDate')
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 10

	// Dialogs
	const [selectedLease, setSelectedLease] = useState<Lease | null>(null)
	const [showRenewDialog, setShowRenewDialog] = useState(false)
	const [showTerminateDialog, setShowTerminateDialog] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)

	const { data: leasesResponse, isLoading, error } = useLeaseList({
		limit: 1000,
		offset: 0
	})
	const deleteLeaseMutation = useDeleteLeaseMutation()

	// Memoize rawLeases to prevent useMemo dependency issues
	const rawLeases = useMemo(() => leasesResponse?.data ?? [], [leasesResponse?.data])

	// Transform leases to display format
	const leases: LeaseDisplay[] = useMemo(() => {
		return rawLeases.map(lease => transformLease(lease as LeaseWithNestedRelations))
	}, [rawLeases])

	// Calculate summary stats
	const totalLeases = leases.length
	const activeLeases = leases.filter(l => l.status === 'active').length
	const expiringLeases = leases.filter(l => l.status === 'expiring').length
	const pendingLeases = leases.filter(l => l.status === 'pending_signature').length

	// Filter leases
	const filteredLeases = useMemo(() => {
		return leases.filter(l => {
			if (searchQuery) {
				const query = searchQuery.toLowerCase()
				if (!l.tenantName.toLowerCase().includes(query) && !l.propertyName.toLowerCase().includes(query)) {
					return false
				}
			}
			if (statusFilter !== 'all' && l.status !== statusFilter) {
				return false
			}
			return true
		})
	}, [leases, searchQuery, statusFilter])

	// Sort leases
	const sortedLeases = useMemo(() => {
		return [...filteredLeases].sort((a, b) => {
			let comparison = 0
			switch (sortField) {
				case 'tenant':
					comparison = a.tenantName.localeCompare(b.tenantName)
					break
				case 'property':
					comparison = a.propertyName.localeCompare(b.propertyName)
					break
				case 'startDate':
					comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
					break
				case 'endDate':
					comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
					break
				case 'rent':
					comparison = a.rentAmount - b.rentAmount
					break
				case 'status':
					comparison = a.status.localeCompare(b.status)
					break
			}
			return sortDirection === 'asc' ? comparison : -comparison
		})
	}, [filteredLeases, sortField, sortDirection])

	// Pagination
	const totalPages = Math.ceil(sortedLeases.length / itemsPerPage)
	const paginatedLeases = sortedLeases.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	// Reset page when filters change
	useEffect(() => {
		setCurrentPage(1)
	}, [searchQuery, statusFilter])

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortDirection('asc')
		}
	}

	const toggleSelectAll = () => {
		if (selectedRows.size === sortedLeases.length) {
			setSelectedRows(new Set())
		} else {
			setSelectedRows(new Set(sortedLeases.map(l => l.id)))
		}
	}

	const toggleSelect = (id: string) => {
		const newSelected = new Set(selectedRows)
		if (newSelected.has(id)) {
			newSelected.delete(id)
		} else {
			newSelected.add(id)
		}
		setSelectedRows(newSelected)
	}

	const handleView = (id: string) => {
		router.push(`/leases/${id}`)
	}

	const handleEdit = (id: string) => {
		router.push(`/leases/${id}/edit`)
	}

	const handleRenew = (lease: LeaseDisplay) => {
		setSelectedLease(lease.original)
		setShowRenewDialog(true)
	}

	const handleTerminate = (lease: LeaseDisplay) => {
		setSelectedLease(lease.original)
		setShowTerminateDialog(true)
	}

	const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
		<button
			onClick={() => handleSort(field)}
			className={`flex items-center gap-1 hover:text-foreground transition-colors group ${className}`}
		>
			{children}
			<ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortField === field ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`} />
		</button>
	)

	if (isLoading) {
		return <LeasesPageSkeleton />
	}

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Leases</h2>
					<p className="text-muted-foreground">
						{error instanceof Error ? error.message : 'Failed to load leases'}
					</p>
				</div>
			</div>
		)
	}

	// Empty state
	if (leases.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="max-w-md mx-auto text-center py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
					<div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center mx-auto mb-6">
						<FileText className="w-8 h-8 text-primary" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						No leases yet
					</h2>
					<p className="text-muted-foreground mb-6">
						Create your first lease to start managing tenant agreements.
					</p>
					<Link
						href="/leases/new"
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<Plus className="w-5 h-5" />
						Create First Lease
					</Link>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Leases</h1>
					<p className="text-sm text-muted-foreground mt-1">Manage lease agreements and renewals</p>
				</div>
				<Link
					href="/leases/new"
					className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
				>
					<Plus className="w-4 h-4" />
					New Lease
				</Link>
			</div>

			{/* Stats Row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '50ms' }}>
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Total Leases</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">{totalLeases}</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<FileText className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '100ms' }}>
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Active</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">{activeLeases}</p>
						<div className="w-9 h-9 rounded-sm bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
							<Check className="w-4 h-4 text-emerald-500" />
						</div>
					</div>
				</div>
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '150ms' }}>
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Expiring Soon</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">{expiringLeases}</p>
						<div className="w-9 h-9 rounded-sm bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
							<AlertTriangle className="w-4 h-4 text-orange-500" />
						</div>
					</div>
				</div>
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '200ms' }}>
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Pending Signature</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">{pendingLeases}</p>
						<div className="w-9 h-9 rounded-sm bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
							<Clock className="w-4 h-4 text-amber-500" />
						</div>
					</div>
				</div>
			</div>

			{/* Table Card */}
			<div className="bg-card border border-border rounded-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: '250ms' }}>
				{/* Toolbar */}
				<div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
					{/* Left: Search */}
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<input
							type="text"
							placeholder="Search leases..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
						/>
					</div>

					{/* Right: Clear + Filter */}
					<div className="flex items-center gap-2 sm:ml-auto">
						{(searchQuery || statusFilter !== 'all') && (
							<button
								onClick={() => {
									setSearchQuery('')
									setStatusFilter('all')
								}}
								className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
							>
								<X className="w-3.5 h-3.5" />
								Clear
							</button>
						)}
						<div className="relative">
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="appearance-none pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
							>
								<option value="all">All Statuses</option>
								<option value="active">Active</option>
								<option value="expiring">Expiring Soon</option>
								<option value="pending_signature">Pending Signature</option>
								<option value="ended">Ended</option>
								<option value="terminated">Terminated</option>
							</select>
							<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						</div>
					</div>
				</div>

				{/* Bulk Actions */}
				{selectedRows.size > 0 && (
					<div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
						<span className="text-sm font-medium text-foreground">
							{selectedRows.size} selected
						</span>
						<div className="flex items-center gap-2">
							<button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors">
								Export
							</button>
							<button
								onClick={() => setSelectedRows(new Set())}
								className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Clear
							</button>
						</div>
					</div>
				)}

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-border bg-muted/30">
								<th className="w-12 px-4 py-3">
									<input
										type="checkbox"
										checked={selectedRows.size === sortedLeases.length && sortedLeases.length > 0}
										onChange={toggleSelectAll}
										className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
									/>
								</th>
								<th className="px-4 py-3 text-left">
									<SortHeader field="tenant" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Tenant
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left hidden lg:table-cell">
									<SortHeader field="property" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Property
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left hidden md:table-cell">
									<SortHeader field="endDate" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										End Date
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left hidden md:table-cell">
									<SortHeader field="rent" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Rent
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left">
									<SortHeader field="status" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Status
									</SortHeader>
								</th>
								<th className="w-24 px-4 py-3"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{paginatedLeases.map((lease) => (
								<tr
									key={lease.id}
									className={`hover:bg-muted/50 transition-colors ${selectedRows.has(lease.id) ? 'bg-primary/5' : ''}`}
								>
									<td className="px-4 py-3">
										<input
											type="checkbox"
											checked={selectedRows.has(lease.id)}
											onChange={() => toggleSelect(lease.id)}
											className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
										/>
									</td>
									<td className="px-4 py-3">
										<button
											onClick={() => handleView(lease.id)}
											className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
										>
											{lease.tenantName}
										</button>
										<p className="text-sm text-muted-foreground lg:hidden">{lease.propertyName}</p>
									</td>
									<td className="px-4 py-3 hidden lg:table-cell">
										<p className="text-sm text-foreground">{lease.propertyName}</p>
										<p className="text-xs text-muted-foreground">Unit {lease.unitNumber}</p>
									</td>
									<td className="px-4 py-3 hidden md:table-cell">
										<p className="text-sm text-foreground">{formatDate(lease.endDate)}</p>
									</td>
									<td className="px-4 py-3 hidden md:table-cell">
										<p className="text-sm text-foreground tabular-nums">
											${lease.rentAmount.toLocaleString()}/mo
										</p>
									</td>
									<td className="px-4 py-3">
										{getStatusBadge(lease.status)}
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={() => handleView(lease.id)}
												className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
												title="View"
											>
												<Eye className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleEdit(lease.id)}
												className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
												title="Edit"
											>
												<Pencil className="w-4 h-4" />
											</button>
											{lease.status === 'active' && (
												<>
													<button
														onClick={() => handleRenew(lease)}
														className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
														title="Renew"
													>
														<RefreshCw className="w-4 h-4" />
													</button>
													<button
														onClick={() => handleTerminate(lease)}
														className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
														title="Terminate"
													>
														<X className="w-4 h-4" />
													</button>
												</>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="px-4 py-3 border-t border-border flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedLeases.length)} of {sortedLeases.length}
						</span>
						<div className="flex items-center gap-1">
							<button
								onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<span className="px-3 py-1 text-sm text-foreground">
								{currentPage} / {totalPages}
							</span>
							<button
								onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}

				{/* No results */}
				{sortedLeases.length === 0 && leases.length > 0 && (
					<div className="text-center py-12">
						<Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
						<p className="text-muted-foreground">No leases match your filters</p>
						<button
							onClick={() => {
								setSearchQuery('')
								setStatusFilter('all')
							}}
							className="mt-3 text-sm text-primary hover:underline"
						>
							Clear filters
						</button>
					</div>
				)}
			</div>

			{/* Dialogs */}
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
						description="Are you sure you want to delete this lease? This action cannot be undone."
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
