/**
 * Leases Store - Leases Page State Management
 *
 * Consolidates useState calls from the leases page to prevent
 * excessive re-renders on filter changes.
 *
 * State categories:
 * - Filters: search, status filter
 * - Sorting: field, direction
 * - Pagination: current page
 * - Selection: selected row IDs
 * - Dialogs: selected lease, dialog visibility states
 *
 * @see TODO.md REACT-001 for context
 */

import { create } from 'zustand'
import type { Lease } from '@repo/shared/types/core'
import type {
	SortField,
	SortDirection
} from '#components/leases/table/lease-utils'
export type StatusFilter =
	| 'all'
	| 'active'
	| 'expiring'
	| 'pending_signature'
	| 'expired'
	| 'terminated'
	| 'draft'

export interface LeasesState {
	// Tab state (note: synced with URL in component)
	activeTab: string

	// Filter state
	searchQuery: string
	statusFilter: StatusFilter

	// Sort state
	sortField: SortField
	sortDirection: SortDirection

	// Pagination state
	currentPage: number
	itemsPerPage: number

	// Selection state
	selectedRows: Set<string>

	// Dialog state
	selectedLease: Lease | null
	showRenewDialog: boolean
	showTerminateDialog: boolean
	showDeleteDialog: boolean
}

export interface LeasesActions {
	// Tab actions
	setActiveTab: (tab: string) => void

	// Filter actions
	setSearchQuery: (query: string) => void
	setStatusFilter: (filter: StatusFilter) => void
	clearFilters: () => void

	// Sort actions
	setSortField: (field: SortField) => void
	setSortDirection: (direction: SortDirection) => void
	toggleSort: (field: SortField) => void

	// Pagination actions
	setCurrentPage: (page: number) => void
	resetPagination: () => void

	// Selection actions
	toggleSelectAll: (allIds: string[]) => void
	toggleSelect: (id: string) => void
	clearSelection: () => void

	// Dialog actions
	openRenewDialog: (lease: Lease) => void
	openTerminateDialog: (lease: Lease) => void
	openDeleteDialog: (lease: Lease) => void
	closeRenewDialog: () => void
	closeTerminateDialog: () => void
	closeDeleteDialog: () => void
	closeAllDialogs: () => void

	// Reset store
	reset: () => void
}

const initialState: LeasesState = {
	activeTab: 'overview',
	searchQuery: '',
	statusFilter: 'all',
	sortField: 'endDate',
	sortDirection: 'asc',
	currentPage: 1,
	itemsPerPage: 10,
	selectedRows: new Set(),
	selectedLease: null,
	showRenewDialog: false,
	showTerminateDialog: false,
	showDeleteDialog: false
}

export const useLeasesStore = create<LeasesState & LeasesActions>((set, get) => ({
	...initialState,

	// Tab actions
	setActiveTab: tab => set({ activeTab: tab }),

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

	toggleSort: field => {
		const { sortField, sortDirection } = get()
		if (sortField === field) {
			set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' })
		} else {
			set({ sortField: field, sortDirection: 'asc' })
		}
	},

	// Pagination actions
	setCurrentPage: page => set({ currentPage: page }),

	resetPagination: () => set({ currentPage: 1 }),

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

	// Dialog actions
	openRenewDialog: lease => {
		set({ selectedLease: lease, showRenewDialog: true })
	},

	openTerminateDialog: lease => {
		set({ selectedLease: lease, showTerminateDialog: true })
	},

	openDeleteDialog: lease => {
		set({ selectedLease: lease, showDeleteDialog: true })
	},

	closeRenewDialog: () => {
		set({ showRenewDialog: false, selectedLease: null })
	},

	closeTerminateDialog: () => {
		set({ showTerminateDialog: false, selectedLease: null })
	},

	closeDeleteDialog: () => {
		set({ showDeleteDialog: false, selectedLease: null })
	},

	closeAllDialogs: () => {
		set({
			showRenewDialog: false,
			showTerminateDialog: false,
			showDeleteDialog: false,
			selectedLease: null
		})
	},

	// Reset store
	reset: () => set(initialState)
}))

/**
 * Selector hooks for optimized re-renders
 * Use these instead of accessing the full store when you only need specific slices
 */
export const useLeasesFilters = () =>
	useLeasesStore(state => ({
		searchQuery: state.searchQuery,
		statusFilter: state.statusFilter,
		setSearchQuery: state.setSearchQuery,
		setStatusFilter: state.setStatusFilter,
		clearFilters: state.clearFilters
	}))

export const useLeasesSorting = () =>
	useLeasesStore(state => ({
		sortField: state.sortField,
		sortDirection: state.sortDirection,
		toggleSort: state.toggleSort
	}))

export const useLeasesPagination = () =>
	useLeasesStore(state => ({
		currentPage: state.currentPage,
		itemsPerPage: state.itemsPerPage,
		setCurrentPage: state.setCurrentPage
	}))

export const useLeasesSelection = () =>
	useLeasesStore(state => ({
		selectedRows: state.selectedRows,
		toggleSelectAll: state.toggleSelectAll,
		toggleSelect: state.toggleSelect,
		clearSelection: state.clearSelection
	}))

export const useLeasesDialogs = () =>
	useLeasesStore(state => ({
		selectedLease: state.selectedLease,
		showRenewDialog: state.showRenewDialog,
		showTerminateDialog: state.showTerminateDialog,
		showDeleteDialog: state.showDeleteDialog,
		openRenewDialog: state.openRenewDialog,
		openTerminateDialog: state.openTerminateDialog,
		openDeleteDialog: state.openDeleteDialog,
		closeRenewDialog: state.closeRenewDialog,
		closeTerminateDialog: state.closeTerminateDialog,
		closeDeleteDialog: state.closeDeleteDialog
	}))
