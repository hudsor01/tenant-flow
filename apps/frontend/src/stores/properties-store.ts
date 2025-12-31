/**
 * Properties Store - Properties Component State Management
 *
 * Consolidates useState calls from the properties component to prevent
 * excessive re-renders on filter changes.
 *
 * State categories:
 * - View: grid/table view mode
 * - Filters: search, status filter, type filter
 * - Selection: selected row IDs
 * - Bulk Edit: dialog state and form values
 *
 * @see TODO.md REACT-001 pattern
 */

import { create } from 'zustand'
import type { PropertyType } from '#components/properties/types'
import type { PropertyStatus } from '@repo/shared/types/core'

export type PropertyStatusFilter = 'all' | 'occupied' | 'available' | 'maintenance'

export interface PropertiesState {
	// View state
	viewMode: 'grid' | 'table'

	// Filter state
	searchQuery: string
	statusFilter: PropertyStatusFilter
	typeFilter: string

	// Selection state
	selectedRows: Set<string>

	// Bulk Edit dialog state
	isBulkEditOpen: boolean
	bulkEditStatus: PropertyStatus
	bulkEditType: PropertyType
	applyBulkStatus: boolean
	applyBulkType: boolean
	isBulkSaving: boolean
}

export interface PropertiesActions {
	// View actions
	setViewMode: (mode: 'grid' | 'table') => void

	// Filter actions
	setSearchQuery: (query: string) => void
	setStatusFilter: (filter: PropertyStatusFilter) => void
	setTypeFilter: (filter: string) => void
	clearFilters: () => void

	// Selection actions
	toggleSelect: (id: string) => void
	selectAll: (ids: string[]) => void
	clearSelection: () => void

	// Bulk Edit actions
	openBulkEdit: (initialStatus: PropertyStatus, initialType: PropertyType) => void
	closeBulkEdit: () => void
	setBulkEditStatus: (status: PropertyStatus) => void
	setBulkEditType: (type: PropertyType) => void
	setApplyBulkStatus: (apply: boolean) => void
	setApplyBulkType: (apply: boolean) => void
	setIsBulkSaving: (saving: boolean) => void

	// Reset store
	reset: () => void
}

const initialState: PropertiesState = {
	viewMode: 'grid',
	searchQuery: '',
	statusFilter: 'all',
	typeFilter: 'all',
	selectedRows: new Set(),
	isBulkEditOpen: false,
	bulkEditStatus: 'active',
	bulkEditType: 'single_family',
	applyBulkStatus: false,
	applyBulkType: false,
	isBulkSaving: false
}

export const usePropertiesStore = create<PropertiesState & PropertiesActions>(
	(set, get) => ({
		...initialState,

		// View actions
		setViewMode: mode => set({ viewMode: mode }),

		// Filter actions
		setSearchQuery: query => set({ searchQuery: query }),

		setStatusFilter: filter => set({ statusFilter: filter }),

		setTypeFilter: filter => set({ typeFilter: filter }),

		clearFilters: () => {
			set({
				searchQuery: '',
				statusFilter: 'all',
				typeFilter: 'all'
			})
		},

		// Selection actions
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

		selectAll: ids => {
			const { selectedRows } = get()
			if (selectedRows.size === ids.length) {
				set({ selectedRows: new Set() })
			} else {
				set({ selectedRows: new Set(ids) })
			}
		},

		clearSelection: () => set({ selectedRows: new Set() }),

		// Bulk Edit actions
		openBulkEdit: (initialStatus, initialType) => {
			set({
				isBulkEditOpen: true,
				bulkEditStatus: initialStatus,
				bulkEditType: initialType,
				applyBulkStatus: false,
				applyBulkType: false
			})
		},

		closeBulkEdit: () => {
			set({
				isBulkEditOpen: false,
				applyBulkStatus: false,
				applyBulkType: false
			})
		},

		setBulkEditStatus: status => set({ bulkEditStatus: status }),

		setBulkEditType: type => set({ bulkEditType: type }),

		setApplyBulkStatus: apply => set({ applyBulkStatus: apply }),

		setApplyBulkType: apply => set({ applyBulkType: apply }),

		setIsBulkSaving: saving => set({ isBulkSaving: saving }),

		// Reset store
		reset: () => set(initialState)
	})
)

/**
 * Selector hooks for optimized re-renders
 */
export const usePropertiesView = () =>
	usePropertiesStore(state => ({
		viewMode: state.viewMode,
		setViewMode: state.setViewMode
	}))

export const usePropertiesFilters = () =>
	usePropertiesStore(state => ({
		searchQuery: state.searchQuery,
		statusFilter: state.statusFilter,
		typeFilter: state.typeFilter,
		setSearchQuery: state.setSearchQuery,
		setStatusFilter: state.setStatusFilter,
		setTypeFilter: state.setTypeFilter,
		clearFilters: state.clearFilters
	}))

export const usePropertiesSelection = () =>
	usePropertiesStore(state => ({
		selectedRows: state.selectedRows,
		toggleSelect: state.toggleSelect,
		selectAll: state.selectAll,
		clearSelection: state.clearSelection
	}))

export const usePropertiesBulkEdit = () =>
	usePropertiesStore(state => ({
		isBulkEditOpen: state.isBulkEditOpen,
		bulkEditStatus: state.bulkEditStatus,
		bulkEditType: state.bulkEditType,
		applyBulkStatus: state.applyBulkStatus,
		applyBulkType: state.applyBulkType,
		isBulkSaving: state.isBulkSaving,
		openBulkEdit: state.openBulkEdit,
		closeBulkEdit: state.closeBulkEdit,
		setBulkEditStatus: state.setBulkEditStatus,
		setBulkEditType: state.setBulkEditType,
		setApplyBulkStatus: state.setApplyBulkStatus,
		setApplyBulkType: state.setApplyBulkType,
		setIsBulkSaving: state.setIsBulkSaving
	}))
