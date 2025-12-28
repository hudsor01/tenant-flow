'use client'

import { useState, useEffect } from 'react'
import {
	Users,
	Search,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Pencil,
	Trash2,
	Check,
	ArrowUpDown,
	FileText,
	Clock,
	AlertCircle,
	UserPlus,
	Eye,
	MoreHorizontal
} from 'lucide-react'
import type {
	TenantListProps,
	Tenant,
	LeaseStatus
} from '@/../product/sections/tenants/types'

function getStatusBadge(status: LeaseStatus) {
	const config = {
		active: {
			className: 'bg-success/10 text-success',
			label: 'Active'
		},
		pending: {
			className: 'bg-warning/10 text-warning',
			label: 'Pending'
		},
		expired: {
			className: 'bg-muted text-muted-foreground',
			label: 'Expired'
		},
		terminated: {
			className: 'bg-destructive/10 text-destructive',
			label: 'Terminated'
		}
	}

	const { className, label } = config[status]

	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
		>
			{label}
		</span>
	)
}

// ============================================================================
// MAIN TENANT LIST (Table Only)
// ============================================================================

type SortField = 'name' | 'email' | 'property' | 'status'
type SortDirection = 'asc' | 'desc'

export function TenantList({
	tenants,
	onView,
	onEdit,
	onDelete,
	onInvite,
	onFilterChange
}: TenantListProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [sortField, setSortField] = useState<SortField>('name')
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
	const [currentPage, setCurrentPage] = useState(1)
	const [openMenuId, setOpenMenuId] = useState<string | null>(null)
	const itemsPerPage = 10

	// Calculate summary stats
	const totalTenants = tenants.length
	const activeTenants = tenants.filter(t => t.leaseStatus === 'active').length
	const pendingTenants = tenants.filter(t => t.leaseStatus === 'pending').length
	const expiredTenants = tenants.filter(t => t.leaseStatus === 'expired').length

	// Filter tenants
	const filteredTenants = tenants.filter(t => {
		if (
			searchQuery &&
			!(t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
			!(t.email || '').toLowerCase().includes(searchQuery.toLowerCase())
		) {
			return false
		}
		if (statusFilter !== 'all' && t.leaseStatus !== statusFilter) {
			return false
		}
		return true
	})

	// Sort tenants
	const sortedTenants = [...filteredTenants].sort((a, b) => {
		let comparison = 0
		switch (sortField) {
			case 'name':
				comparison = (a.name || '').localeCompare(b.name || '')
				break
			case 'email':
				comparison = (a.email || '').localeCompare(b.email || '')
				break
			case 'property':
				comparison = (a.currentProperty || '').localeCompare(
					b.currentProperty || ''
				)
				break
			case 'status':
				comparison = (a.leaseStatus || '').localeCompare(b.leaseStatus || '')
				break
		}
		return sortDirection === 'asc' ? comparison : -comparison
	})

	// Pagination
	const totalPages = Math.ceil(sortedTenants.length / itemsPerPage)
	const paginatedTenants = sortedTenants.slice(
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
		if (selectedRows.size === sortedTenants.length) {
			setSelectedRows(new Set())
		} else {
			setSelectedRows(new Set(sortedTenants.map(t => t.id)))
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

	const SortHeader = ({
		field,
		children,
		className = ''
	}: {
		field: SortField
		children: React.ReactNode
		className?: string
	}) => (
		<button
			onClick={() => handleSort(field)}
			className={`flex items-center gap-1 hover:text-foreground transition-colors group ${className}`}
		>
			{children}
			<ArrowUpDown
				className={`w-3.5 h-3.5 transition-colors ${sortField === field ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`}
			/>
		</button>
	)

	// Empty state
	if (tenants.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center mx-auto mb-6">
						<Users className="w-8 h-8 text-primary" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						No tenants yet
					</h2>
					<p className="text-muted-foreground mb-6">
						Invite your first tenant to get started with lease management.
					</p>
					<button
						onClick={onInvite}
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<UserPlus className="w-5 h-5" />
						Invite Your First Tenant
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Tenants</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage tenants and send invitations
					</p>
				</div>
				<button
					onClick={onInvite}
					className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
				>
					<UserPlus className="w-4 h-4" />
					Invite Tenant
				</button>
			</div>

			{/* Stats Row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Total</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">{totalTenants}</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<Users className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Active</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">
							{activeTenants}
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<Check className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Pending</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">
							{pendingTenants}
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<Clock className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>
				<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-muted-foreground">Expired</p>
					</div>
					<div className="flex items-end justify-between">
						<p className="text-2xl font-bold text-foreground">
							{expiredTenants}
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
							<AlertCircle className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>
			</div>

			{/* Table Card */}
			<div className="bg-card border border-border rounded-sm overflow-hidden">
				{/* Toolbar: Search LEFT, Filters RIGHT */}
				<div className="px-4 py-3 border-b border-border flex items-center gap-3">
					{/* LEFT: Search */}
					<div className="relative w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<input
							type="text"
							placeholder="Search tenants..."
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
						/>
					</div>

					{/* RIGHT: Filter */}
					<div className="flex items-center gap-3 ml-auto">
						{(searchQuery || statusFilter !== 'all') && (
							<button
								onClick={() => {
									setSearchQuery('')
									setStatusFilter('all')
								}}
								className="text-sm text-muted-foreground hover:text-foreground"
							>
								Clear
							</button>
						)}

						<div className="relative">
							<select
								value={statusFilter}
								onChange={e => {
									setStatusFilter(e.target.value)
									onFilterChange?.(e.target.value as any)
								}}
								className="appearance-none pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
							>
								<option value="all">All Statuses</option>
								<option value="active">Active</option>
								<option value="pending">Pending</option>
								<option value="expired">Expired</option>
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
							<button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-muted transition-colors">
								Send Message
							</button>
							<button className="px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-sm transition-colors">
								Delete
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
										checked={
											selectedRows.size === sortedTenants.length &&
											sortedTenants.length > 0
										}
										onChange={toggleSelectAll}
										className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
									/>
								</th>
								<th className="px-4 py-3 text-left">
									<SortHeader
										field="name"
										className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
									>
										Tenant
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left hidden md:table-cell">
									<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Contact
									</span>
								</th>
								<th className="px-4 py-3 text-left hidden lg:table-cell">
									<SortHeader
										field="property"
										className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
									>
										Property
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left">
									<SortHeader
										field="status"
										className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
									>
										Status
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left hidden xl:table-cell">
									<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Lease
									</span>
								</th>
								<th className="w-20 px-4 py-3"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{paginatedTenants.map(tenant => (
								<tr
									key={tenant.id}
									className={`hover:bg-muted/50 transition-colors ${selectedRows.has(tenant.id) ? 'bg-primary/5' : ''}`}
								>
									<td className="px-4 py-3">
										<input
											type="checkbox"
											checked={selectedRows.has(tenant.id)}
											onChange={() => toggleSelect(tenant.id)}
											className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
										/>
									</td>
									<td className="px-4 py-3">
										<button
											onClick={() => onView?.(tenant.id)}
											className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
										>
											{tenant.name}
										</button>
										<p className="text-sm text-muted-foreground truncate md:hidden">
											{tenant.email}
										</p>
									</td>
									<td className="px-4 py-3 hidden md:table-cell">
										<a
											href={`mailto:${tenant.email}`}
											className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
										>
											{tenant.email}
										</a>
										{tenant.phone && (
											<p className="text-sm text-muted-foreground">
												{tenant.phone}
											</p>
										)}
									</td>
									<td className="px-4 py-3 hidden lg:table-cell">
										{tenant.currentProperty ? (
											<button
												onClick={() =>
													console.log('View property:', tenant.currentProperty)
												}
												className="text-left hover:text-primary transition-colors group"
											>
												<p className="text-sm text-foreground group-hover:text-primary group-hover:underline">
													{tenant.currentProperty}
												</p>
												{tenant.currentUnit && (
													<p className="text-xs text-muted-foreground">
														Unit {tenant.currentUnit}
													</p>
												)}
											</button>
										) : (
											<span className="text-sm text-muted-foreground">—</span>
										)}
									</td>
									<td className="px-4 py-3">
										{getStatusBadge(tenant.leaseStatus)}
									</td>
									<td className="px-4 py-3 hidden xl:table-cell">
										{tenant.leaseId ? (
											<button className="text-sm text-primary hover:underline flex items-center gap-1">
												<FileText className="w-3.5 h-3.5" />
												View
											</button>
										) : (
											<span className="text-sm text-muted-foreground">—</span>
										)}
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											{/* View - Primary action, always visible */}
											<button
												onClick={() => onView?.(tenant.id)}
												className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
												title="View tenant"
												aria-label="View tenant"
											>
												<Eye className="w-4 h-4" />
											</button>
											{/* More actions dropdown */}
											<div className="relative">
												<button
													onClick={() =>
														setOpenMenuId(
															openMenuId === tenant.id ? null : tenant.id
														)
													}
													className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
													title="More actions"
													aria-label="More actions"
													aria-expanded={openMenuId === tenant.id}
												>
													<MoreHorizontal className="w-4 h-4" />
												</button>
												{openMenuId === tenant.id && (
													<>
														{/* Backdrop to close menu */}
														<div
															className="fixed inset-0 z-10"
															onClick={() => setOpenMenuId(null)}
														/>
														{/* Dropdown menu */}
														<div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-sm shadow-lg z-20 py-1">
															<button
																onClick={() => {
																	onEdit?.(tenant.id)
																	setOpenMenuId(null)
																}}
																className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
															>
																<Pencil className="w-4 h-4" />
																Edit
															</button>
															<button
																onClick={() => {
																	onDelete?.(tenant.id)
																	setOpenMenuId(null)
																}}
																className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
															>
																<Trash2 className="w-4 h-4" />
																Delete
															</button>
														</div>
													</>
												)}
											</div>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{sortedTenants.length > 0 && totalPages > 1 && (
					<div className="px-4 py-3 border-t border-border flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							Showing {(currentPage - 1) * itemsPerPage + 1}–
							{Math.min(currentPage * itemsPerPage, sortedTenants.length)} of{' '}
							{sortedTenants.length}
						</span>
						<div className="flex items-center gap-1">
							<button
								onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
								<button
									key={page}
									onClick={() => setCurrentPage(page)}
									className={`min-w-8 h-8 px-2 text-sm font-medium rounded-md transition-colors ${
										page === currentPage
											? 'bg-primary text-primary-foreground'
											: 'hover:bg-muted text-muted-foreground'
									}`}
								>
									{page}
								</button>
							))}
							<button
								onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}

				{/* No results */}
				{sortedTenants.length === 0 && tenants.length > 0 && (
					<div className="text-center py-12">
						<Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
						<p className="text-muted-foreground">
							No tenants match your filters
						</p>
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
		</div>
	)
}
