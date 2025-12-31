/**
 * Tenants Store - Tenants Component State Management
 *
 * Consolidates useState calls from the tenants component to prevent
 * excessive re-renders on filter changes.
 *
 * State categories:
 * - View: table/grid view mode
 * - Filters: search, status filter
 * - Selection: selected row IDs
 * - Modals: invite modal, detail sheet
 *
 * @see TODO.md REACT-001 pattern
 */

import { create } from 'zustand'

export type TenantStatusFilter =
	| 'all'
	| 'active'
	| 'pending_signature'
	| 'ended'
	| 'terminated'

export interface TenantsState {
	// View state
	viewMode: 'table' | 'grid'

	// Filter state
	searchQuery: string
	statusFilter: TenantStatusFilter

	// Selection state
	selectedIds: Set<string>

	// Modal state
	isInviteModalOpen: boolean
	isDetailSheetOpen: boolean
}

export interface TenantsActions {
	// View actions
	setViewMode: (mode: 'table' | 'grid') => void

	// Filter actions
	setSearchQuery: (query: string) => void
	setStatusFilter: (filter: TenantStatusFilter) => void
	clearFilters: () => void

	// Selection actions
	setSelectedIds: (ids: string[]) => void
	selectAll: (ids: string[]) => void
	clearSelection: () => void

	// Modal actions
	openInviteModal: () => void
	closeInviteModal: () => void
	openDetailSheet: () => void
	closeDetailSheet: () => void
	setDetailSheetOpen: (open: boolean) => void

	// Reset store
	reset: () => void
}

const initialState: TenantsState = {
	viewMode: 'table',
	searchQuery: '',
	statusFilter: 'all',
	selectedIds: new Set(),
	isInviteModalOpen: false,
	isDetailSheetOpen: false
}

export const useTenantsStore = create<TenantsState & TenantsActions>(
	(set, _get) => ({
		...initialState,

		// View actions
		setViewMode: mode => set({ viewMode: mode }),

		// Filter actions
		setSearchQuery: query => set({ searchQuery: query }),

		setStatusFilter: filter => set({ statusFilter: filter }),

		clearFilters: () => {
			set({
				searchQuery: '',
				statusFilter: 'all'
			})
		},

		// Selection actions
		setSelectedIds: ids => set({ selectedIds: new Set(ids) }),

		selectAll: ids => set({ selectedIds: new Set(ids) }),

		clearSelection: () => set({ selectedIds: new Set() }),

		// Modal actions
		openInviteModal: () => set({ isInviteModalOpen: true }),

		closeInviteModal: () => set({ isInviteModalOpen: false }),

		openDetailSheet: () => set({ isDetailSheetOpen: true }),

		closeDetailSheet: () => set({ isDetailSheetOpen: false }),

		setDetailSheetOpen: open => set({ isDetailSheetOpen: open }),

		// Reset store
		reset: () => set(initialState)
	})
)

/**
 * Selector hooks for optimized re-renders
 */
export const useTenantsView = () =>
	useTenantsStore(state => ({
		viewMode: state.viewMode,
		setViewMode: state.setViewMode
	}))

export const useTenantsFilters = () =>
	useTenantsStore(state => ({
		searchQuery: state.searchQuery,
		statusFilter: state.statusFilter,
		setSearchQuery: state.setSearchQuery,
		setStatusFilter: state.setStatusFilter,
		clearFilters: state.clearFilters
	}))

export const useTenantsSelection = () =>
	useTenantsStore(state => ({
		selectedIds: state.selectedIds,
		setSelectedIds: state.setSelectedIds,
		selectAll: state.selectAll,
		clearSelection: state.clearSelection
	}))

export const useTenantsModals = () =>
	useTenantsStore(state => ({
		isInviteModalOpen: state.isInviteModalOpen,
		isDetailSheetOpen: state.isDetailSheetOpen,
		openInviteModal: state.openInviteModal,
		closeInviteModal: state.closeInviteModal,
		openDetailSheet: state.openDetailSheet,
		closeDetailSheet: state.closeDetailSheet,
		setDetailSheetOpen: state.setDetailSheetOpen
	}))
