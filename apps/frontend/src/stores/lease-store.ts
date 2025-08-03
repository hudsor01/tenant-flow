import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { supabaseSafe } from '@/lib/clients'
import { toast } from 'sonner'
import type { SupabaseTableData } from '@/hooks/use-infinite-query'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase-generated'

// Types
type LeaseData = SupabaseTableData<'Lease'>
type TenantData = SupabaseTableData<'Tenant'>
type UnitData = SupabaseTableData<'Unit'>
type PropertyData = SupabaseTableData<'Property'>

interface LeaseWithRelations {
  id: string
  unitId: string
  tenantId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  terms: string | null
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  createdAt: string
  updatedAt: string
  Document: {
    id: string
    name: string
    filename?: string | null
    url: string
    type: string
    mimeType?: string | null
    size?: bigint | null
    fileSizeBytes: bigint
    createdAt?: string | null
    updatedAt?: string | null
  }[]
  reminders: {
    id: string
    type: 'RENT_REMINDER' | 'LEASE_EXPIRATION' | 'MAINTENANCE_DUE' | 'PAYMENT_OVERDUE'
    status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED' | 'OPENED'
    recipientEmail: string
    recipientName?: string | null
    subject?: string | null
    content?: string | null
    sentAt?: string | null
    deliveredAt?: string | null
    openedAt?: string | null
    errorMessage?: string | null
    retryCount: number
    createdAt: string
    updatedAt: string
  }[]
  Tenant?: TenantData
  Unit?: UnitData & {
    Property?: PropertyData
  }
}

interface LeaseFilters {
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  propertyId?: string
  tenantId?: string
  expiringInDays?: number
}

interface LeaseCalculations {
  daysUntilExpiry: number | null
  isExpiringSoon: boolean
  isExpired: boolean
  monthsRemaining: number | null
  totalRentAmount: number | null
}

interface LeaseState {
  // Data
  leases: LeaseWithRelations[]
  expiringLeases: LeaseWithRelations[]
  selectedLease: LeaseWithRelations | null
  filters: LeaseFilters
  
  // UI State
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  
  // Stats
  totalCount: number
  activeCount: number
  expiringCount: number
}

interface LeaseActions {
  // Data fetching
  fetchLeases: (reset?: boolean) => Promise<void>
  fetchExpiringLeases: (days?: number) => Promise<void>
  fetchLeaseById: (id: string) => Promise<void>
  
  // Mutations
  createLease: (data: Omit<LeaseData, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LeaseData>
  updateLease: (id: string, data: Partial<LeaseData>) => Promise<void>
  deleteLease: (id: string) => Promise<void>
  terminateLease: (id: string, reason?: string) => Promise<void>
  
  // Filters
  setFilters: (filters: LeaseFilters) => void
  clearFilters: () => void
  
  // Selection
  selectLease: (lease: LeaseWithRelations | null) => void
  
  // Calculations
  calculateLeaseMetrics: (lease: LeaseWithRelations) => LeaseCalculations
  
  // Computed
  getLeasesByProperty: (propertyId: string) => LeaseWithRelations[]
  getLeasesByTenant: (tenantId: string) => LeaseWithRelations[]
  getActiveLeases: () => LeaseWithRelations[]
  
  // Real-time
  subscribeToChanges: () => () => void
  
  // Utils
  reset: () => void
}

const initialState: LeaseState = {
  leases: [],
  expiringLeases: [],
  selectedLease: null,
  filters: {},
  isLoading: false,
  isFetching: false,
  error: null,
  totalCount: 0,
  activeCount: 0,
  expiringCount: 0
}

export const useLeaseStore = create<LeaseState & LeaseActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // Data fetching
          fetchLeases: async (reset = false) => {
            const { filters } = get()
            
            set(state => {
              state.isLoading = !state.leases.length || reset
              state.isFetching = true
              state.error = null
              if (reset) state.leases = []
            })
            
            try {
              const supabase = supabaseSafe.getRawClient()
              if (!supabase) {
                throw new Error('Database connection not available')
              }
              
              // Build query
              let query = supabase
                .from('Lease')
                .select('*, Tenant(*), Unit(*, Property(*))')
                .order('startDate', { ascending: false })
              
              // Apply filters
              if (filters.status) {
                query = query.eq('status', filters.status)
              }
              if (filters.tenantId) {
                query = query.eq('tenantId', filters.tenantId)
              }
              if (filters.propertyId) {
                query = query.eq('Unit.propertyId', filters.propertyId)
              }
              if (filters.expiringInDays) {
                const futureDate = new Date()
                futureDate.setDate(futureDate.getDate() + filters.expiringInDays)
                query = query
                  .gte('endDate', new Date().toISOString())
                  .lte('endDate', futureDate.toISOString())
              }
              
              const { data, error, count } = await query
              
              if (error) throw error
              
              const activeCount = (data || []).filter((l: LeaseData) => l.status === 'ACTIVE').length
              
              set(state => {
                state.leases = data || []
                state.totalCount = count || 0
                state.activeCount = activeCount
                state.isLoading = false
                state.isFetching = false
              })
            } catch (error) {
              set(state => {
                state.error = error as Error
                state.isLoading = false
                state.isFetching = false
              })
              toast.error('Failed to fetch leases')
            }
          },
          
          fetchExpiringLeases: async (days = 30) => {
            try {
              const futureDate = new Date()
              futureDate.setDate(futureDate.getDate() + days)
              
              const supabase = supabaseSafe.getRawClient()
            if (!supabase) {
              throw new Error('Database connection not available')
            }
            const { data, error } = await supabase
                .from('Lease')
                .select('*, Tenant(*), Unit(*, Property(*))')
                .eq('status', 'ACTIVE')
                .gte('endDate', new Date().toISOString())
                .lte('endDate', futureDate.toISOString())
                .order('endDate', { ascending: true })
              
              if (error) throw error
              
              set(state => {
                state.expiringLeases = data || []
                state.expiringCount = data?.length || 0
              })
            } catch {
              toast.error('Failed to fetch expiring leases')
            }
          },
          
          fetchLeaseById: async (id: string) => {
            try {
              const supabase = supabaseSafe.getRawClient()
            if (!supabase) {
              throw new Error('Database connection not available')
            }
            const { data, error } = await supabase
                .from('Lease')
                .select('*, Tenant(*), Unit(*, Property(*))')
                .eq('id', id)
                .single()
              
              if (error) throw error
              
              set(state => {
                state.selectedLease = data
                // Update in list if exists
                const index = state.leases.findIndex(l => l.id === id)
                if (index !== -1) {
                  state.leases[index] = data
                }
              })
            } catch {
              toast.error('Failed to fetch lease details')
            }
          },
          
          // Mutations
          createLease: async (data) => {
            const { data: lease, error } = await supabaseSafe
              .from('Lease')
              .insert(data)
              .select()
              .single()
            
            if (error) throw error
            
            // Fetch with relations
            await get().fetchLeaseById(lease.id)
            
            toast.success('Lease created successfully')
            return lease
          },
          
          updateLease: async (id, data) => {
            const { error } = await supabaseSafe
              .from('Lease')
              .update(data)
              .eq('id', id)
            
            if (error) throw error
            
            // Refresh the lease data
            await get().fetchLeaseById(id)
            
            toast.success('Lease updated successfully')
          },
          
          deleteLease: async (id) => {
            const { error } = await supabaseSafe
              .from('Lease')
              .delete()
              .eq('id', id)
            
            if (error) throw error
            
            set(state => {
              state.leases = state.leases.filter(l => l.id !== id)
              state.expiringLeases = state.expiringLeases.filter(l => l.id !== id)
              state.totalCount -= 1
              if (state.selectedLease?.id === id) {
                state.selectedLease = null
              }
            })
            
            toast.success('Lease deleted successfully')
          },
          
          terminateLease: async (id, _reason) => {
            await get().updateLease(id, {
              status: 'TERMINATED',
              endDate: new Date().toISOString()
            })
            
            toast.success('Lease terminated')
          },
          
          // Filters
          setFilters: (filters) => set(state => {
            state.filters = { ...state.filters, ...filters }
          }),
          
          clearFilters: () => set(state => {
            state.filters = {}
          }),
          
          // Selection
          selectLease: (lease) => set(state => {
            state.selectedLease = lease
          }),
          
          // Calculations
          calculateLeaseMetrics: (lease) => {
            const now = Date.now()
            const endDate = lease.endDate ? new Date(lease.endDate).getTime() : null
            const startDate = lease.startDate ? new Date(lease.startDate).getTime() : null
            
            const daysUntilExpiry = endDate
              ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
              : null
            
            return {
              daysUntilExpiry,
              isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0,
              isExpired: endDate ? endDate < now : false,
              monthsRemaining: endDate
                ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24 * 30)))
                : null,
              totalRentAmount:
                lease.rentAmount && startDate && endDate
                  ? (() => {
                      const start = new Date(startDate)
                      const end = new Date(endDate)
                      const months =
                        (end.getFullYear() - start.getFullYear()) * 12 +
                        (end.getMonth() - start.getMonth())
                      return lease.rentAmount * months
                    })()
                  : null
            }
          },
          
          // Computed
          getLeasesByProperty: (propertyId) => {
            return get().leases.filter(l => l.Unit?.propertyId === propertyId)
          },
          
          getLeasesByTenant: (tenantId) => {
            return get().leases.filter(l => l.tenantId === tenantId)
          },
          
          getActiveLeases: () => {
            return get().leases.filter(l => l.status === 'ACTIVE')
          },
          
          // Real-time subscription
          subscribeToChanges: () => {
            const channel = supabaseSafe
              .channel('lease-store-changes')
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'Lease'
                },
                (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['Lease']['Row']>) => {
                  if (import.meta.env.DEV) {
                    console.warn('Lease change:', payload)
                  }
                  
                  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    void get().fetchLeaseById(payload.new?.id as string)
                  } else if (payload.eventType === 'DELETE') {
                    set(state => {
                      state.leases = state.leases.filter(l => l.id !== payload.old?.id as string)
                      state.expiringLeases = state.expiringLeases.filter(l => l.id !== payload.old?.id as string)
                      if (state.selectedLease?.id === payload.old?.id as string) {
                        state.selectedLease = null
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
        name: 'lease-store',
        partialize: (state) => ({
          filters: state.filters,
          selectedLease: state.selectedLease
        })
      }
    )
  )
)

// Selectors
export const selectLeases = (state: LeaseState) => state.leases
export const selectExpiringLeases = (state: LeaseState) => state.expiringLeases
export const selectSelectedLease = (state: LeaseState) => state.selectedLease
export const selectLeaseFilters = (state: LeaseState) => state.filters
export const selectActiveLeases = (state: LeaseState) => state.leases.filter(l => l.status === 'ACTIVE')