import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Property, Unit } from '@tenantflow/shared/types/properties'
import type { Tenant } from '@tenantflow/shared/types/tenants'
import type { Lease } from '@tenantflow/shared/types/leases'

// Selection state for cross-component data sharing
export interface SelectionState {
  // Selected entities for context sharing
  selectedProperty: Property | null
  selectedTenant: Tenant | null
  selectedUnit: Unit | null
  selectedLease: Lease | null
  
  // Bulk selection for operations
  bulkSelection: {
    properties: Set<string>
    tenants: Set<string>
    units: Set<string>
    leases: Set<string>
  }
  
  // Operation mode
  selectionMode: 'single' | 'bulk' | 'none'
  
  // Filter state
  filters: {
    propertyType?: string
    tenantStatus?: string
    unitStatus?: string
    leaseStatus?: string
    dateRange?: { start: Date; end: Date }
  }
}

interface SelectionActions {
  // Single selection actions
  setSelectedProperty: (property: Property | null) => void
  setSelectedTenant: (tenant: Tenant | null) => void
  setSelectedUnit: (unit: Unit | null) => void
  setSelectedLease: (lease: Lease | null) => void
  
  // Bulk selection actions
  toggleBulkItem: (type: keyof SelectionState['bulkSelection'], id: string) => void
  selectAllItems: (type: keyof SelectionState['bulkSelection'], ids: string[]) => void
  clearBulkSelection: (type?: keyof SelectionState['bulkSelection']) => void
  
  // Selection mode
  setSelectionMode: (mode: SelectionState['selectionMode']) => void
  
  // Filter actions
  setFilter: <K extends keyof SelectionState['filters']>(
    key: K,
    value: SelectionState['filters'][K]
  ) => void
  clearFilters: () => void
  
  // Utility actions
  clearAllSelections: () => void
  getSelectedCount: (type: keyof SelectionState['bulkSelection']) => number
}

const initialState: SelectionState = {
  selectedProperty: null,
  selectedTenant: null,
  selectedUnit: null,
  selectedLease: null,
  bulkSelection: {
    properties: new Set(),
    tenants: new Set(),
    units: new Set(),
    leases: new Set(),
  },
  selectionMode: 'none',
  filters: {},
}

export const useSelectionStore = create<SelectionState & SelectionActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,
        
        // Single selection actions
        setSelectedProperty: (property) => set((state) => {
          state.selectedProperty = property
          // Clear related selections when property changes
          if (property?.id !== state.selectedProperty?.id) {
            state.selectedUnit = null
            state.selectedLease = null
          }
        }, false, 'setSelectedProperty'),
        
        setSelectedTenant: (tenant) => set((state) => {
          state.selectedTenant = tenant
          // Clear lease selection if tenant changes
          if (tenant?.id !== state.selectedTenant?.id) {
            state.selectedLease = null
          }
        }, false, 'setSelectedTenant'),
        
        setSelectedUnit: (unit) => set((state) => {
          state.selectedUnit = unit
        }, false, 'setSelectedUnit'),
        
        setSelectedLease: (lease) => set((state) => {
          state.selectedLease = lease
        }, false, 'setSelectedLease'),
        
        // Bulk selection actions
        toggleBulkItem: (type, id) => set((state) => {
          if (state.bulkSelection[type].has(id)) {
            state.bulkSelection[type].delete(id)
          } else {
            state.bulkSelection[type].add(id)
          }
        }, false, 'toggleBulkItem'),
        
        selectAllItems: (type, ids) => set((state) => {
          state.bulkSelection[type] = new Set(ids)
        }, false, 'selectAllItems'),
        
        clearBulkSelection: (type) => set((state) => {
          if (type) {
            state.bulkSelection[type].clear()
          } else {
            Object.keys(state.bulkSelection).forEach(key => {
              state.bulkSelection[key as keyof typeof state.bulkSelection].clear()
            })
          }
        }, false, 'clearBulkSelection'),
        
        // Selection mode
        setSelectionMode: (mode) => set((state) => {
          state.selectionMode = mode
          // Clear bulk selections when exiting bulk mode
          if (mode !== 'bulk') {
            Object.keys(state.bulkSelection).forEach(key => {
              state.bulkSelection[key as keyof typeof state.bulkSelection].clear()
            })
          }
        }, false, 'setSelectionMode'),
        
        // Filter actions
        setFilter: (key, value) => set((state) => {
          state.filters[key] = value
        }, false, 'setFilter'),
        
        clearFilters: () => set((state) => {
          state.filters = {}
        }, false, 'clearFilters'),
        
        // Utility actions
        clearAllSelections: () => set((state) => {
          state.selectedProperty = null
          state.selectedTenant = null
          state.selectedUnit = null
          state.selectedLease = null
          Object.keys(state.bulkSelection).forEach(key => {
            state.bulkSelection[key as keyof typeof state.bulkSelection].clear()
          })
          state.selectionMode = 'none'
        }, false, 'clearAllSelections'),
        
        getSelectedCount: (type) => {
          return get().bulkSelection[type].size
        },
      }))
    ),
    {
      name: 'tenantflow-selection-store',
    }
  )
)

// Selectors for optimized subscriptions
export const selectSelectedProperty = (state: SelectionState & SelectionActions) => state.selectedProperty
export const selectSelectedTenant = (state: SelectionState & SelectionActions) => state.selectedTenant
export const selectSelectedUnit = (state: SelectionState & SelectionActions) => state.selectedUnit
export const selectSelectedLease = (state: SelectionState & SelectionActions) => state.selectedLease

export const selectBulkSelection = (type: keyof SelectionState['bulkSelection']) => 
  (state: SelectionState & SelectionActions) => state.bulkSelection[type]

export const selectFilters = (state: SelectionState & SelectionActions) => state.filters
export const selectSelectionMode = (state: SelectionState & SelectionActions) => state.selectionMode

// Computed selectors
export const selectHasAnySelection = (state: SelectionState & SelectionActions) => {
  return !!(
    state.selectedProperty || 
    state.selectedTenant || 
    state.selectedUnit || 
    state.selectedLease ||
    Object.values(state.bulkSelection).some(set => set.size > 0)
  )
}

export const selectSelectedPropertyUnits = (state: SelectionState & SelectionActions) => {
  return state.selectedProperty?.units || []
}

export const selectAvailableUnits = (state: SelectionState & SelectionActions) => {
  return state.selectedProperty?.units?.filter(unit => 
    unit.status === 'VACANT' || unit.status === 'RESERVED'
  ) || []
}

// Action hooks for common patterns
export const usePropertySelection = () => useSelectionStore((state) => ({
  selectedProperty: state.selectedProperty,
  setSelectedProperty: state.setSelectedProperty,
  clearSelection: () => state.setSelectedProperty(null),
}))

export const useTenantSelection = () => useSelectionStore((state) => ({
  selectedTenant: state.selectedTenant,
  setSelectedTenant: state.setSelectedTenant,
  clearSelection: () => state.setSelectedTenant(null),
}))

export const useBulkActions = () => useSelectionStore((state) => ({
  selectionMode: state.selectionMode,
  setSelectionMode: state.setSelectionMode,
  toggleBulkItem: state.toggleBulkItem,
  selectAllItems: state.selectAllItems,
  clearBulkSelection: state.clearBulkSelection,
  getSelectedCount: state.getSelectedCount,
}))