import { useInfiniteQuery, type SupabaseTableData } from './use-infinite-query'
import { supabase } from '@/lib/clients'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import { useMemo } from 'react'

// Type-safe lease data
type LeaseData = SupabaseTableData<'Lease'>
type TenantData = SupabaseTableData<'Tenant'>
type UnitData = SupabaseTableData<'Unit'>
type PropertyData = SupabaseTableData<'Property'>

// Extended lease type with relations
interface LeaseWithRelations extends LeaseData {
  Tenant?: TenantData
  Unit?: UnitData & {
    Property?: PropertyData
  }
}

interface UseSupabaseLeasesOptions {
  pageSize?: number
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  propertyId?: string
  tenantId?: string
  expiringInDays?: number
}

export function useSupabaseLeases(options: UseSupabaseLeasesOptions = {}) {
  const { user } = useAuth()
  const {
    pageSize = 20,
    status,
    propertyId,
    tenantId,
    expiringInDays
  } = options

  const query = useInfiniteQuery<LeaseWithRelations>({
    tableName: 'Lease',
    columns: '*, Tenant(*), Unit(*, Property(*))',
    pageSize,
    trailingQuery: (query) => {
      let modifiedQuery = query

      // Apply filters
      if (status) {
        modifiedQuery = modifiedQuery.eq('status', status) as any
      }
      if (tenantId) {
        modifiedQuery = modifiedQuery.eq('tenantId', tenantId) as any
      }
      
      // Filter by property through unit relation
      if (propertyId) {
        modifiedQuery = modifiedQuery.eq('Unit.propertyId', propertyId) as any
      }

      // Filter expiring leases
      if (expiringInDays) {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + expiringInDays)
        modifiedQuery = modifiedQuery
          .gte('endDate', new Date().toISOString())
          .lte('endDate', futureDate.toISOString()) as any
      }

      // Only show leases for properties owned by current user
      if (user?.id) {
        modifiedQuery = modifiedQuery.eq('Unit.Property.ownerId', user.id) as any
      }

      // Sort by start date descending
      modifiedQuery = modifiedQuery.order('startDate', { ascending: false }) as any

      return modifiedQuery
    }
  })

  return {
    ...query,
    leases: query.data,
    totalCount: query.count,
    isEmpty: query.data.length === 0 && !query.isLoading
  }
}

// Hook for expiring leases specifically
export function useExpiringLeases(days = 30) {
  return useSupabaseLeases({ expiringInDays: days })
}

// Lease calculations hook
export function useLeaseCalculations(lease?: LeaseWithRelations) {
  return useMemo(() => {
    if (!lease) return null

    const now = Date.now()
    const endDate = lease.endDate ? new Date(lease.endDate).getTime() : null
    const startDate = lease.startDate ? new Date(lease.startDate).getTime() : null

    const daysUntilExpiry = endDate
      ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
      : null

    return {
      daysUntilExpiry,
      isExpiringSoon: (threshold = 30) =>
        daysUntilExpiry !== null &&
        daysUntilExpiry <= threshold &&
        daysUntilExpiry > 0,
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
  }, [lease])
}

// Mutations
export function useCreateLease() {
  const create = async (data: Omit<LeaseData, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data: lease, error } = await supabase
      .from('Lease')
      .insert(data)
      .select('*, Tenant(*), Unit(*, Property(*))')
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Lease created successfully')
    return lease
  }

  return { create }
}

export function useUpdateLease() {
  const update = async (id: string, data: Partial<LeaseData>) => {
    const { data: lease, error } = await supabase
      .from('Lease')
      .update(data)
      .eq('id', id)
      .select('*, Tenant(*), Unit(*, Property(*))')
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Lease updated successfully')
    return lease
  }

  return { update }
}

export function useDeleteLease() {
  const deleteLease = async (id: string) => {
    const { error } = await supabase
      .from('Lease')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Lease deleted successfully')
  }

  return { deleteLease }
}

// Real-time subscription for lease updates
export function useRealtimeLeases(onUpdate?: (payload: any) => void) {
  const { user } = useAuth()

  if (!user?.id) return

  const channel = supabase
    .channel('leases-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'Lease'
      },
      (payload) => {
        console.log('Lease change:', payload)
        if (onUpdate) {
          onUpdate(payload)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Composite hook
export function useLeaseActions() {
  const leases = useSupabaseLeases()
  const expiringLeases = useExpiringLeases()
  const { create } = useCreateLease()
  const { update } = useUpdateLease()
  const { deleteLease } = useDeleteLease()

  return {
    // Data
    leases: leases.leases,
    expiringLeases: expiringLeases.leases,
    total: leases.totalCount,
    
    // Loading states
    isLoading: leases.isLoading,
    isFetching: leases.isFetching,
    
    // Pagination
    hasMore: leases.hasMore,
    fetchNextPage: leases.fetchNextPage,
    
    // Mutations
    create,
    update,
    delete: deleteLease,
    
    // Utility
    refresh: () => leases.fetchNextPage(),
    getLeaseCalculations: useLeaseCalculations
  }
}