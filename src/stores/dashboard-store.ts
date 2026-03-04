import { create } from 'zustand'

// =============================================================================
// Types
// =============================================================================

export type DashboardViewMode = 'table' | 'grid'
export type DashboardStatusFilter = 'all' | 'active' | 'expiring' | 'vacant'
export type DashboardSortField = 'property' | 'rent' | 'units' | 'status'
export type DashboardSortDirection = 'asc' | 'desc'

interface DashboardState {
	// View mode
	viewMode: DashboardViewMode
	// Filters
	searchQuery: string
	statusFilter: DashboardStatusFilter
	// Sorting
	sortField: DashboardSortField
	sortDirection: DashboardSortDirection
	// Pagination
	currentPage: number
	itemsPerPage: number
}

interface DashboardActions {
	// View mode
	setViewMode: (mode: DashboardViewMode) => void
	// Filters
	setSearchQuery: (query: string) => void
	setStatusFilter: (filter: DashboardStatusFilter) => void
	clearFilters: () => void
	// Sorting
	handleSort: (field: DashboardSortField) => void
	// Pagination
	setCurrentPage: (page: number) => void
}

// =============================================================================
// Store
// =============================================================================

export const useDashboardStore = create<DashboardState & DashboardActions>(
	(set, get) => ({
		// Initial state
		viewMode: 'table',
		searchQuery: '',
		statusFilter: 'all',
		sortField: 'property',
		sortDirection: 'asc',
		currentPage: 1,
		itemsPerPage: 10,

		// Actions
		setViewMode: mode => set({ viewMode: mode }),

		setSearchQuery: query => set({ searchQuery: query, currentPage: 1 }),

		setStatusFilter: filter => set({ statusFilter: filter, currentPage: 1 }),

		clearFilters: () =>
			set({
				searchQuery: '',
				statusFilter: 'all',
				currentPage: 1
			}),

		handleSort: field => {
			const { sortField, sortDirection } = get()
			if (sortField === field) {
				set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' })
			} else {
				set({ sortField: field, sortDirection: 'asc' })
			}
		},

		setCurrentPage: page => set({ currentPage: page })
	})
)

// =============================================================================
// Selector hooks for optimized re-renders
// =============================================================================

export const useDashboardViewMode = () =>
	useDashboardStore(state => ({
		viewMode: state.viewMode,
		setViewMode: state.setViewMode
	}))

export const useDashboardFilters = () =>
	useDashboardStore(state => ({
		searchQuery: state.searchQuery,
		statusFilter: state.statusFilter,
		setSearchQuery: state.setSearchQuery,
		setStatusFilter: state.setStatusFilter,
		clearFilters: state.clearFilters
	}))

export const useDashboardSorting = () =>
	useDashboardStore(state => ({
		sortField: state.sortField,
		sortDirection: state.sortDirection,
		handleSort: state.handleSort
	}))

export const useDashboardPagination = () =>
	useDashboardStore(state => ({
		currentPage: state.currentPage,
		itemsPerPage: state.itemsPerPage,
		setCurrentPage: state.setCurrentPage
	}))
