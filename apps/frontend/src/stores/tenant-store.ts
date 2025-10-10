import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { TenantWithLeaseInfo } from '@repo/shared/types/core'

interface TenantStore {
  currentTenant: TenantWithLeaseInfo | null
  selectedTenantId: string | null


  // Tenant list and cache
  tenants: Record<string, TenantWithLeaseInfo>
  tenantList: string[]
  isLoading: boolean
  hasFetched: boolean


  // Actions
  setCurrentTenant: (tenant: TenantWithLeaseInfo | null) => void
  setSelectedTenantId: (id: string | null) => void
  addTenant: (tenant: TenantWithLeaseInfo) => void
  updateTenant: (id: string, updates: Partial<TenantWithLeaseInfo>) => void
  removeTenant: (id: string) => void
  setTenants: (tenants: TenantWithLeaseInfo[]) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useTenantStore = create<TenantStore>()(
  subscribeWithSelector((set) => ({
    currentTenant: null,
    selectedTenantId: null,
    tenants: {},
    tenantList: [],
    isLoading: false,
    hasFetched: false,

    setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
    setSelectedTenantId: (id) => set({ selectedTenantId: id }),

    addTenant: (tenant) =>
      set((state) => ({
        tenants: { ...state.tenants, [tenant.id]: tenant },
        tenantList: state.tenantList.includes(tenant.id)
          ? state.tenantList
          : [...state.tenantList, tenant.id]
      })),

    updateTenant: (id, updates) =>
      set((state) => {
        const existingTenant = state.tenants[id]
        if (!existingTenant) return state

        const updatedTenant = { ...existingTenant, ...updates } as TenantWithLeaseInfo
        return {
          tenants: {
            ...state.tenants,
            [id]: updatedTenant
          },
          currentTenant: state.currentTenant?.id === id
            ? updatedTenant
            : state.currentTenant
        }
      }),

    removeTenant: (id) =>
      set((state) => {
        const newTenants = { ...state.tenants }
        delete newTenants[id]
        const newTenantList = state.tenantList.filter(tenantId => tenantId !== id)

        return {
          tenants: newTenants,
          tenantList: newTenantList,
          currentTenant: state.currentTenant?.id === id ? null : state.currentTenant,
          selectedTenantId: state.selectedTenantId === id ? null : state.selectedTenantId
        }
      }),

    setTenants: (tenants) =>
      set({
        tenants: tenants.reduce((acc, tenant) => ({ ...acc, [tenant.id]: tenant }), {}),
        tenantList: tenants.map(tenant => tenant.id),
        hasFetched: true
      }),

    setLoading: (loading) => set({ isLoading: loading }),

    clear: () => set({
      currentTenant: null,
      selectedTenantId: null,
      tenants: {},
      tenantList: [],
      isLoading: false,
      hasFetched: false
    })
  }))
)

// Selectors
export const useCurrentTenant = () => useTenantStore((state) => state.currentTenant)
export const useSelectedTenantId = () => useTenantStore((state) => state.selectedTenantId)
export const useTenantById = (id: string) => useTenantStore((state) => state.tenants[id])
export const useTenantList = () => useTenantStore((state) =>
  state.tenantList.map(id => state.tenants[id]).filter(Boolean)
)
export const useTenantStoreState = () => useTenantStore((state) => state)
