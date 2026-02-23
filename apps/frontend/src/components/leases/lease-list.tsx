'use client'

/**
 * Uses Zustand store for state management (useLeasesStore).
 * See stores/leases-store.ts for state structure.
 */

import { Plus } from 'lucide-react'
import type { LeaseListProps } from '@repo/shared/types/sections/leases'
import { useLeasesStore } from '#stores/leases-store'
import type { SortField } from '#components/leases/table/lease-utils'
import { BlurFade } from '#components/ui/blur-fade'
import { LeaseListEmpty } from '#components/leases/lease-list-empty'
import { LeaseListStats } from '#components/leases/lease-list-stats'
import { LeaseListToolbar } from '#components/leases/lease-list-toolbar'
import { LeaseListTable } from '#components/leases/lease-list-table'

export function LeaseList({
	leases,
	onView,
	onCreate,
	onFilterChange
}: LeaseListProps) {
	const {
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		clearFilters,
		sortField,
		sortDirection,
		toggleSort,
		selectedRows,
		toggleSelectAll,
		toggleSelect,
		clearSelection,
		currentPage,
		setCurrentPage,
		itemsPerPage
	} = useLeasesStore()

	// Calculate summary stats
	const totalLeases = leases.length
	const activeLeases = leases.filter(l => l.status === 'active').length
	const expiringLeases = leases.filter(
		l => l.status === 'active' && l.daysUntilExpiry !== undefined && l.daysUntilExpiry <= 60
	).length
	const pendingLeases = leases.filter(l => l.status === 'pending_signature').length

	// Filter leases
	const filteredLeases = leases.filter(l => {
		if (
			searchQuery &&
			!(l.tenantName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) &&
			!(l.propertyName ?? '').toLowerCase().includes(searchQuery.toLowerCase())
		) {
			return false
		}
		if (statusFilter !== 'all' && l.status !== statusFilter) {
			return false
		}
		return true
	})

	// Sort leases
	const sortedLeases = [...filteredLeases].sort((a, b) => {
		let comparison = 0
		switch (sortField) {
			case 'tenant':
				comparison = (a.tenantName ?? '').localeCompare(b.tenantName ?? '')
				break
			case 'property':
				comparison = (a.propertyName ?? '').localeCompare(b.propertyName ?? '')
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

	// Pagination
	const totalPages = Math.ceil(sortedLeases.length / itemsPerPage)
	const paginatedLeases = sortedLeases.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	const handleSort = (field: SortField) => {
		toggleSort(field)
	}

	if (leases.length === 0) {
		return <LeaseListEmpty onCreate={onCreate} />
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Page Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-bold text-foreground">Leases</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Manage lease agreements and renewals
						</p>
					</div>
					<button
						onClick={onCreate}
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<Plus className="w-4 h-4" />
						New Lease
					</button>
				</div>
			</BlurFade>

			<LeaseListStats
				totalLeases={totalLeases}
				activeLeases={activeLeases}
				expiringLeases={expiringLeases}
				pendingLeases={pendingLeases}
			/>

			{/* Table Card */}
			<BlurFade delay={0.6} inView>
				<div className="bg-card border border-border rounded-sm overflow-hidden">
					<LeaseListToolbar
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						statusFilter={statusFilter}
						onStatusFilterChange={setStatusFilter}
						hasActiveFilters={searchQuery !== '' || statusFilter !== 'all'}
						onClearFilters={clearFilters}
						selectedCount={selectedRows.size}
						onClearSelection={clearSelection}
						onFilterChange={onFilterChange}
					/>
					<LeaseListTable
						paginatedLeases={paginatedLeases}
						sortedLeases={sortedLeases}
						sortField={sortField}
						onSort={handleSort}
						selectedRows={selectedRows}
						onToggleSelectAll={toggleSelectAll}
						onToggleSelect={toggleSelect}
						onView={onView}
						currentPage={currentPage}
						totalPages={totalPages}
						itemsPerPage={itemsPerPage}
						onPageChange={setCurrentPage}
						onClearFilters={clearFilters}
						hasLeases={leases.length > 0}
					/>
				</div>
			</BlurFade>
		</div>
	)
}
