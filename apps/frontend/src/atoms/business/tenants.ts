import { atom } from 'jotai'
import { atomWithQuery } from 'jotai-tanstack-query'
import { TenantsApi } from '../../lib/api/tenants'
import type { Tenant } from '@repo/shared'

// Re-export types from shared package
export type { Tenant } from '@repo/shared'

export interface TenantFilters {
  status?: string
  propertyId?: string
  searchQuery?: string
}

// Core atoms
export const tenantsAtom = atom<Tenant[]>([])
export const selectedTenantAtom = atom<Tenant | null>(null)
export const tenantFiltersAtom = atom<TenantFilters>({})

// Loading states
export const tenantsLoadingAtom = atom<boolean>(false)
export const tenantsFetchingAtom = atom<boolean>(false)
export const tenantsErrorAtom = atom<string | null>(null)

// API Query Atoms
export const tenantsQueryAtom = atomWithQuery(() => ({
  queryKey: ['tenants'],
  queryFn: () => TenantsApi.getTenants(),
}))

// Stats
export const totalTenantsCountAtom = atom<number>(0)

// Computed selectors
export const filteredTenantsAtom = atom((get) => {
  const tenants = get(tenantsAtom)
  const filters = get(tenantFiltersAtom)
  
  return tenants.filter(tenant => {
    if (filters.status && tenant.invitationStatus !== filters.status) return false
    // TODO: Add propertyId relation to Tenant interface if needed
    // if (filters.propertyId && tenant.propertyId !== filters.propertyId) return false
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      const fullName = tenant.name.toLowerCase()
      return fullName.includes(query) || 
             tenant.email.toLowerCase().includes(query)
    }
    return true
  })
})

export const activeTenentsAtom = atom((get) => 
  get(tenantsAtom).filter(tenant => tenant.invitationStatus === 'ACCEPTED')
)

export const tenantsByPropertyAtom = atom(() => {
  // TODO: Add propertyId relation to Tenant interface if needed
  // const tenants = get(tenantsAtom)
  // return tenants.reduce((acc, tenant) => {
  //   const propertyId = tenant.propertyId
  //   if (propertyId) {
  //     if (!acc[propertyId]) {
  //       acc[propertyId] = []
  //     }
  //     acc[propertyId].push(tenant)
  //   }
  //   return acc
  // }, {} as Record<string, Tenant[]>)
  return {} as Record<string, Tenant[]>
})

export const tenantsByStatusAtom = atom((get) => {
  const tenants = get(tenantsAtom)
  return tenants.reduce((acc, tenant) => {
    const status = tenant.invitationStatus
    if (!acc[status]) {
      acc[status] = 0
    }
    acc[status]++
    return acc
  }, {} as Record<string, number>)
})

// Actions
export const setTenantsAtom = atom(
  null,
  (get, set, tenants: Tenant[]) => {
    set(tenantsAtom, tenants)
    set(totalTenantsCountAtom, tenants.length)
  }
)

export const addTenantAtom = atom(
  null,
  (get, set, tenant: Tenant) => {
    const currentTenants = get(tenantsAtom)
    set(tenantsAtom, [tenant, ...currentTenants])
    set(totalTenantsCountAtom, currentTenants.length + 1)
  }
)

export const updateTenantAtom = atom(
  null,
  (get, set, updatedTenant: Partial<Tenant> & { id: string }) => {
    const currentTenants = get(tenantsAtom)
    const updatedTenants = currentTenants.map(tenant =>
      tenant.id === updatedTenant.id 
        ? { ...tenant, ...updatedTenant }
        : tenant
    )
    
    set(tenantsAtom, updatedTenants)
    
    // Update selected tenant if it matches
    const selectedTenant = get(selectedTenantAtom)
    if (selectedTenant?.id === updatedTenant.id) {
      set(selectedTenantAtom, { ...selectedTenant, ...updatedTenant })
    }
  }
)

export const deleteTenantAtom = atom(
  null,
  (get, set, tenantId: string) => {
    const currentTenants = get(tenantsAtom)
    const filteredTenants = currentTenants.filter(t => t.id !== tenantId)
    
    set(tenantsAtom, filteredTenants)
    set(totalTenantsCountAtom, filteredTenants.length)
    
    // Clear selected tenant if it was deleted
    const selectedTenant = get(selectedTenantAtom)
    if (selectedTenant?.id === tenantId) {
      set(selectedTenantAtom, null)
    }
  }
)

export const setTenantFiltersAtom = atom(
  null,
  (get, set, filters: TenantFilters) => {
    const currentFilters = get(tenantFiltersAtom)
    set(tenantFiltersAtom, { ...currentFilters, ...filters })
  }
)

export const clearTenantFiltersAtom = atom(
  null,
  (get, set) => {
    set(tenantFiltersAtom, {})
  }
)

export const selectTenantAtom = atom(
  null,
  (get, set, tenant: Tenant | null) => {
    set(selectedTenantAtom, tenant)
  }
)

export const setTenantsLoadingAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(tenantsLoadingAtom, loading)
  }
)

export const setTenantsErrorAtom = atom(
  null,
  (get, set, error: string | null) => {
    set(tenantsErrorAtom, error)
  }
)