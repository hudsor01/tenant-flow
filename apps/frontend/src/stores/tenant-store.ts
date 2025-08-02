import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { supabaseSafe } from '@/lib/clients'
import { toast } from 'sonner'
import type { SupabaseTableData } from '@/hooks/use-infinite-query'

// Types
type TenantData = SupabaseTableData<'Tenant'>
type LeaseData = SupabaseTableData<'Lease'>

interface TenantWithRelations {
  id: string
  name: string
  email: string
  phone: string | null
  emergencyContact: string | null
  userId: string | null
  invitationStatus: string
  invitationToken: string | null
  invitedBy: string | null
  invitedAt: string | null
  acceptedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  User: string | null
  Lease?: LeaseData[]
  activeLeaseCount?: number
}

interface TenantFilters {
  invitationStatus?: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
  searchQuery?: string
  hasActiveLease?: boolean
}

interface TenantState {
  // Data
  tenants: TenantWithRelations[]
  selectedTenant: TenantWithRelations | null
  filters: TenantFilters
  
  // UI State
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  
  // Stats
  totalCount: number
  pendingInvitations: number
  activeTenants: number
}

interface TenantActions {
  // Data fetching
  fetchTenants: (reset?: boolean) => Promise<void>
  fetchTenantById: (id: string) => Promise<void>
  
  // Mutations
  inviteTenant: (data: Omit<TenantData, 'id' | 'createdAt' | 'updatedAt' | 'invitedBy' | 'invitedAt' | 'invitationToken' | 'invitationStatus'>) => Promise<TenantData>
  updateTenant: (id: string, data: Partial<TenantData>) => Promise<void>
  deleteTenant: (id: string) => Promise<void>
  resendInvitation: (tenantId: string) => Promise<void>
  cancelInvitation: (tenantId: string) => Promise<void>
  
  // Filters
  setFilters: (filters: TenantFilters) => void
  clearFilters: () => void
  searchTenants: (query: string) => void
  
  // Selection
  selectTenant: (tenant: TenantWithRelations | null) => void
  
  // Computed
  getPendingInvitations: () => TenantWithRelations[]
  getActiveTenants: () => TenantWithRelations[]
  getTenantByEmail: (email: string) => TenantWithRelations | undefined
  
  // Real-time
  subscribeToChanges: () => () => void
  
  // Utils
  reset: () => void
}

const initialState: TenantState = {
  tenants: [],
  selectedTenant: null,
  filters: {},
  isLoading: false,
  isFetching: false,
  error: null,
  totalCount: 0,
  pendingInvitations: 0,
  activeTenants: 0
}

export const useTenantStore = create<TenantState & TenantActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // Data fetching
          fetchTenants: async (reset = false) => {
            const { filters } = get()
            const user = (await supabaseSafe.auth.getUser()).data.user
            if (!user) return
            
            set(state => {
              state.isLoading = !state.tenants.length || reset
              state.isFetching = true
              state.error = null
              if (reset) state.tenants = []
            })
            
            try {
              // Build query
              let query = supabaseSafe
                .from('Tenant')
                .select('*, Lease(*)')
                .eq('invitedBy', user.id)
                .order('name', { ascending: true })
              
              // Apply filters
              if (filters.invitationStatus) {
                query = query.eq('invitationStatus', filters.invitationStatus)
              }
              if (filters.searchQuery) {
                query = query.or(
                  `name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%`
                )
              }
              
              const { data, error, count } = await query
              
              if (error) throw error
              
              // Process tenants with lease counts
              const tenantsWithCounts = (data || []).map((tenant: TenantData) => ({
                ...tenant,
                activeLeaseCount: tenant.Lease?.filter((l: LeaseData) => l.status === 'ACTIVE').length || 0
              }))
              
              // Filter by active lease if needed
              let filteredTenants = tenantsWithCounts
              if (filters.hasActiveLease !== undefined) {
                filteredTenants = tenantsWithCounts.filter((t: TenantData & { activeLeaseCount: number }) => 
                  filters.hasActiveLease ? t.activeLeaseCount > 0 : t.activeLeaseCount === 0
                )
              }
              
              const pendingCount = filteredTenants.filter((t: TenantData & { activeLeaseCount: number }) => t.invitationStatus === 'PENDING').length
              const activeCount = filteredTenants.filter((t: TenantData & { activeLeaseCount: number }) => t.invitationStatus === 'ACCEPTED').length
              
              set(state => {
                state.tenants = filteredTenants
                state.totalCount = count || 0
                state.pendingInvitations = pendingCount
                state.activeTenants = activeCount
                state.isLoading = false
                state.isFetching = false
              })
            } catch (error) {
              set(state => {
                state.error = error as Error
                state.isLoading = false
                state.isFetching = false
              })
              toast.error('Failed to fetch tenants')
            }
          },
          
          fetchTenantById: async (id: string) => {
            try {
              const { data, error } = await supabaseSafe
                .from('Tenant')
                .select('*, Lease(*)')
                .eq('id', id)
                .single()
              
              if (error) throw error
              
              const tenantWithCount = {
                ...data,
                activeLeaseCount: data.Lease?.filter((l: LeaseData) => l.status === 'ACTIVE').length || 0
              }
              
              set(state => {
                state.selectedTenant = tenantWithCount
                // Update in list if exists
                const index = state.tenants.findIndex(t => t.id === id)
                if (index !== -1) {
                  state.tenants[index] = tenantWithCount
                }
              })
            } catch {
              toast.error('Failed to fetch tenant details')
            }
          },
          
          // Mutations
          inviteTenant: async (data) => {
            const user = (await supabaseSafe.auth.getUser()).data.user
            if (!user) throw new Error('Not authenticated')
            
            // Generate invitation token
            const invitationToken = crypto.randomUUID()
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry
            
            const { data: tenant, error } = await supabaseSafe
              .from('Tenant')
              .insert({
                ...data,
                invitedBy: user.id,
                invitedAt: new Date().toISOString(),
                invitationToken,
                expiresAt: expiresAt.toISOString(),
                invitationStatus: 'PENDING'
              })
              .select()
              .single()
            
            if (error) throw error
            
            set(state => {
              state.tenants.unshift({ ...tenant, activeLeaseCount: 0 })
              state.totalCount += 1
              state.pendingInvitations += 1
            })
            
            // TODO: Send invitation email
            toast.success('Tenant invited successfully')
            return tenant
          },
          
          updateTenant: async (id, data) => {
            const { error } = await supabaseSafe
              .from('Tenant')
              .update(data)
              .eq('id', id)
            
            if (error) throw error
            
            // Refresh the tenant data
            await get().fetchTenantById(id)
            
            toast.success('Tenant updated successfully')
          },
          
          deleteTenant: async (id) => {
            // Check for active leases
            const tenant = get().tenants.find(t => t.id === id)
            if (tenant?.activeLeaseCount && tenant.activeLeaseCount > 0) {
              toast.error('Cannot delete tenant with active leases')
              throw new Error('Tenant has active leases')
            }
            
            const { error } = await supabaseSafe
              .from('Tenant')
              .delete()
              .eq('id', id)
            
            if (error) throw error
            
            set(state => {
              const tenant = state.tenants.find(t => t.id === id)
              if (tenant) {
                if (tenant.invitationStatus === 'PENDING') state.pendingInvitations -= 1
                if (tenant.invitationStatus === 'ACCEPTED') state.activeTenants -= 1
              }
              
              state.tenants = state.tenants.filter(t => t.id !== id)
              state.totalCount -= 1
              if (state.selectedTenant?.id === id) {
                state.selectedTenant = null
              }
            })
            
            toast.success('Tenant removed successfully')
          },
          
          resendInvitation: async (tenantId) => {
            const newToken = crypto.randomUUID()
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7)
            
            await get().updateTenant(tenantId, {
              invitationToken: newToken,
              expiresAt: expiresAt.toISOString(),
              invitationStatus: 'PENDING'
            })
            
            // TODO: Send invitation email
            toast.success('Invitation resent successfully')
          },
          
          cancelInvitation: async (tenantId) => {
            await get().updateTenant(tenantId, {
              invitationStatus: 'CANCELLED'
            })
            
            toast.success('Invitation cancelled')
          },
          
          // Filters
          setFilters: (filters) => set(state => {
            state.filters = { ...state.filters, ...filters }
          }),
          
          clearFilters: () => set(state => {
            state.filters = {}
          }),
          
          searchTenants: (query) => {
            get().setFilters({ searchQuery: query })
          },
          
          // Selection
          selectTenant: (tenant) => set(state => {
            state.selectedTenant = tenant
          }),
          
          // Computed
          getPendingInvitations: () => {
            return get().tenants.filter(t => t.invitationStatus === 'PENDING')
          },
          
          getActiveTenants: () => {
            return get().tenants.filter(t => t.invitationStatus === 'ACCEPTED')
          },
          
          getTenantByEmail: (email) => {
            return get().tenants.find(t => t.email === email)
          },
          
          // Real-time subscription
          subscribeToChanges: () => {
            if (!supabaseSafe.auth) return () => { /* no-op */ }
            
            const channel = supabaseSafe.getRawClient()
              ?.channel('tenant-store-changes')
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'Tenant'
                },
                (payload: { eventType: string; new?: { id: string }; old?: { id: string } }) => {
                  console.warn('Tenant change:', payload)
                  
                  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    if (payload.new?.id) {
                      void get().fetchTenantById(payload.new.id)
                    }
                  } else if (payload.eventType === 'DELETE' && payload.old?.id) {
                    set(state => {
                      const tenant = state.tenants.find(t => t.id === payload.old?.id)
                      if (tenant) {
                        if (tenant.invitationStatus === 'PENDING') state.pendingInvitations -= 1
                        if (tenant.invitationStatus === 'ACCEPTED') state.activeTenants -= 1
                      }
                      
                      state.tenants = state.tenants.filter(t => t.id !== payload.old?.id)
                      if (state.selectedTenant?.id === payload.old?.id) {
                        state.selectedTenant = null
                      }
                    })
                  }
                }
              )
              .subscribe()
            
            return () => {
              void supabaseSafe.getRawClient()?.removeChannel(channel)
            }
          },
          
          reset: () => set(initialState)
        }))
      ),
      {
        name: 'tenant-store',
        partialize: (state) => ({
          filters: state.filters,
          selectedTenant: state.selectedTenant
        })
      }
    )
  )
)

// Selectors
export const selectTenants = (state: TenantState) => state.tenants
export const selectSelectedTenant = (state: TenantState) => state.selectedTenant
export const selectTenantFilters = (state: TenantState) => state.filters
export const selectPendingInvitations = (state: TenantState) => state.tenants.filter(t => t.invitationStatus === 'PENDING')