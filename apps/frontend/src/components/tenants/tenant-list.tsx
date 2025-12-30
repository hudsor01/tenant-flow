'use client'

/**
 * Uses Zustand store for state management (useTenantListStore).
 * See stores/tenant-list-store.ts for state structure.
 */

import { UserPlus } from 'lucide-react'
import type { TenantItem, LeaseStatus } from '@repo/shared/types/sections/tenants'
import { useTenantListStore } from '#stores/tenant-list-store'
import { TenantStatsRow } from './components/tenant-stats-row'
import { TenantToolbar } from './components/tenant-toolbar'
import { TenantBulkActions } from './components/tenant-bulk-actions'
import { TenantTable } from './components/tenant-table'
import { TenantPagination } from './components/tenant-pagination'
import {
	NoTenantsEmptyState,
	NoResultsEmptyState
} from './components/tenant-empty-states'

interface TenantListProps {
	tenants: TenantItem[]
	onView?: (id: string) => void
	onEdit?: (id: string) => void
	onDelete?: (id: string) => void
	onInvite?: () => void
	onFilterChange?: (filter: LeaseStatus | 'all') => void
}

export function TenantList({
	tenants,
	onView,
	onEdit,
	onDelete,
	onInvite,
	onFilterChange
}: TenantListProps) {
	// Get state and actions from Zustand store
	const {
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		clearFilters,
		sortField,
		sortDirection,
		handleSort,
		selectedRows,
		toggleSelectAll,
		toggleSelect,
		clearSelection,
		currentPage,
		setCurrentPage,
		itemsPerPage
	} = useTenantListStore()

	// Calculate summary stats
	const totalTenants = tenants.length
	const activeTenants = tenants.filter(t => t.leaseStatus === 'active').length
	const pendingTenants = tenants.filter(
		t => t.leaseStatus === 'pending_signature'
	).length
	const endedTenants = tenants.filter(t => t.leaseStatus === 'ended').length

	// Filter tenants
	const filteredTenants = tenants.filter(t => {
		if (
			searchQuery &&
			!(t.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
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
				comparison = (a.fullName || '').localeCompare(b.fullName || '')
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

	// Note: useEffect for pagination reset removed - handled by store actions

	// Empty state - no tenants at all
	if (tenants.length === 0) {
		return <NoTenantsEmptyState onInvite={onInvite} />
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
			<TenantStatsRow
				totalTenants={totalTenants}
				activeTenants={activeTenants}
				pendingTenants={pendingTenants}
				endedTenants={endedTenants}
			/>

			{/* Table Card */}
			<div className="bg-card border border-border rounded-sm overflow-hidden">
				<TenantToolbar
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					statusFilter={statusFilter}
					onStatusFilterChange={value => setStatusFilter(value as typeof statusFilter)}
					onFilterChange={onFilterChange}
					onClearFilters={clearFilters}
				/>

				<TenantBulkActions
					selectedCount={selectedRows.size}
					onClearSelection={clearSelection}
				/>

				<TenantTable
					tenants={paginatedTenants}
					selectedRows={selectedRows}
					sortField={sortField}
					sortDirection={sortDirection}
					onSort={handleSort}
					onToggleSelectAll={() => toggleSelectAll(sortedTenants.map(t => t.id))}
					onToggleSelect={toggleSelect}
					onView={onView}
					onEdit={onEdit}
					onDelete={onDelete}
				/>

				<TenantPagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={sortedTenants.length}
					itemsPerPage={itemsPerPage}
					onPageChange={setCurrentPage}
				/>

				{/* No results from filtering */}
				{sortedTenants.length === 0 && tenants.length > 0 && (
					<NoResultsEmptyState onClearFilters={clearFilters} />
				)}
			</div>
		</div>
	)
}
