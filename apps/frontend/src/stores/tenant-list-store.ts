/**
 * Tenant List Store - TenantList Component State Management
 *
 * Consolidates useState calls from the TenantList component to prevent
 * excessive re-renders on filter changes.
 *
 * State categories:
 * - Filters: search, status filter
 * - Sorting: field, direction
 * - Selection: selected row IDs
 * - Pagination: current page
 *
 * @see TODO.md SIZE-002 pattern
 */

import { create } from 'zustand'
import type { SortField, SortDirection } from '#components/tenants/tenant-list-types'

export type TenantListStatusFilter = 'all' | 'active' | 'pending_signature' | 'ended' | 'terminated'

export interface TenantListState {
	// Filter state
	searchQuery: string
	statusFilter: TenantListStatusFilter

	// Sort state
	sortField: SortField
	sortDirection: SortDirection

	// Selection state
	selectedRows: Set<string>

	// Pagination state
	currentPage: number
	itemsPerPage: number
}

export interface TenantListActions {
	// Filter actions
	setSearchQuery: (query: string) => void
	setStatusFilter: (filter: TenantListStatusFilter) => void
	clearFilters: () => void

	// Sort actions
	setSortField: (field: SortField) => void
	setSortDirection: (direction: SortDirection) => void
	handleSort: (field: SortField) => void

	// Selection actions
	toggleSelectAll: (allIds: string[]) => void
	toggleSelect: (id: string) => void
	clearSelection: () => void

	// Pagination actions
	setCurrentPage: (page: number) => void
	resetPagination: () => void

	// Reset store
	reset: () => void
}

const initialState: TenantListState = {
	searchQuery: '',
	statusFilter: 'all',
	sortField: 'name',
	sortDirection: 'asc',
	selectedRows: new Set(),
	currentPage: 1,
	itemsPerPage: 10
}

export const useTenantListStore = create<TenantListState & TenantListActions>(
	(set, get) => ({
		...initialState,

		// Filter actions
		setSearchQuery: query => {
			set({ searchQuery: query, currentPage: 1 })
		},

		setStatusFilter: filter => {
			set({ statusFilter: filter, currentPage: 1 })
		},

		clearFilters: () => {
			set({
				searchQuery: '',
				statusFilter: 'all',
				currentPage: 1
			})
		},

		// Sort actions
		setSortField: field => set({ sortField: field }),

		setSortDirection: direction => set({ sortDirection: direction }),

		handleSort: field => {
			const { sortField, sortDirection } = get()
			if (sortField === field) {
				set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' })
			} else {
				set({ sortField: field, sortDirection: 'asc' })
			}
		},

		// Selection actions
		toggleSelectAll: allIds => {
			const { selectedRows } = get()
			if (selectedRows.size === allIds.length) {
				set({ selectedRows: new Set() })
			} else {
				set({ selectedRows: new Set(allIds) })
			}
		},

		toggleSelect: id => {
			const { selectedRows } = get()
			const newSelected = new Set(selectedRows)
			if (newSelected.has(id)) {
				newSelected.delete(id)
			} else {
				newSelected.add(id)
			}
			set({ selectedRows: newSelected })
		},

		clearSelection: () => set({ selectedRows: new Set() }),

		// Pagination actions
		setCurrentPage: page => set({ currentPage: page }),

		resetPagination: () => set({ currentPage: 1 }),

		// Reset store
		reset: () => set(initialState)
	})
)

/**
 * Selector hooks for optimized re-renders
 */
export const useTenantListFilters = () =>
	useTenantListStore(state => ({
		searchQuery: state.searchQuery,
		statusFilter: state.statusFilter,
		setSearchQuery: state.setSearchQuery,
		setStatusFilter: state.setStatusFilter,
		clearFilters: state.clearFilters
	}))

export const useTenantListSorting = () =>
	useTenantListStore(state => ({
		sortField: state.sortField,
		sortDirection: state.sortDirection,
		handleSort: state.handleSort
	}))

export const useTenantListSelection = () =>
	useTenantListStore(state => ({
		selectedRows: state.selectedRows,
		toggleSelectAll: state.toggleSelectAll,
		toggleSelect: state.toggleSelect,
		clearSelection: state.clearSelection
	}))

export const useTenantListPagination = () =>
	useTenantListStore(state => ({
		currentPage: state.currentPage,
		itemsPerPage: state.itemsPerPage,
		setCurrentPage: state.setCurrentPage
	}))
