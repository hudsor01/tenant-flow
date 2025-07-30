import { useInfiniteQuery, type SupabaseTableData } from './use-infinite-query'
import { supabase } from '@/lib/clients'
import { toast } from 'sonner'
import { useAuth } from './useAuth'

// Type-safe unit data
type UnitData = SupabaseTableData<'Unit'>
type PropertyData = SupabaseTableData<'Property'>
type LeaseData = SupabaseTableData<'Lease'>

// Extended unit type with relations - omit string relations and add object ones
type UnitWithRelations = Omit<UnitData, 'Property' | 'Lease'> & {
  Property?: PropertyData
  Lease?: LeaseData[]
}

interface UseSupabaseUnitsOptions {
  pageSize?: number
  propertyId?: string
  status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
  minRent?: number
  maxRent?: number
}

export function useSupabaseUnits(options: UseSupabaseUnitsOptions = {}) {
  const { user } = useAuth()
  const {
    pageSize = 20,
    propertyId,
    status,
    minRent,
    maxRent
  } = options

  const query = useInfiniteQuery<UnitWithRelations>({
    tableName: 'Unit',
    columns: '*, Property(*), Lease(*)',
    pageSize,
    trailingQuery: (query) => {
      let modifiedQuery = query

      // Apply filters
      if (propertyId) {
        modifiedQuery = modifiedQuery.eq('propertyId', propertyId)
      }
      if (status) {
        modifiedQuery = modifiedQuery.eq('status', status)
      }
      if (minRent !== undefined) {
        modifiedQuery = modifiedQuery.gte('rent', minRent)
      }
      if (maxRent !== undefined) {
        modifiedQuery = modifiedQuery.lte('rent', maxRent)
      }

      // Only show units for properties owned by current user
      if (user?.id) {
        modifiedQuery = modifiedQuery.eq('Property.ownerId', user.id)
      }

      // Sort by unit number
      modifiedQuery = modifiedQuery.order('unitNumber', { ascending: true })

      return modifiedQuery
    }
  })

  return {
    ...query,
    units: query.data,
    totalCount: query.count,
    isEmpty: query.data.length === 0 && !query.isLoading,
    vacantCount: query.data.filter(u => u.status === 'VACANT').length,
    occupiedCount: query.data.filter(u => u.status === 'OCCUPIED').length
  }
}

// Get units for a specific property
export function usePropertyUnits(propertyId: string) {
  return useSupabaseUnits({ propertyId })
}

// Get only vacant units
export function useVacantUnits() {
  return useSupabaseUnits({ status: 'VACANT' })
}

// Mutations
export function useCreateUnit() {
  const create = async (data: Omit<UnitData, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data: unit, error } = await supabase
      .from('Unit')
      .insert(data)
      .select('*, Property(*)')
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Unit created successfully')
    return unit
  }

  return { create }
}

export function useUpdateUnit() {
  const update = async (id: string, data: Partial<UnitData>) => {
    const { data: unit, error } = await supabase
      .from('Unit')
      .update(data)
      .eq('id', id)
      .select('*, Property(*)')
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Unit updated successfully')
    return unit
  }

  return { update }
}

export function useDeleteUnit() {
  const deleteUnit = async (id: string) => {
    // Check if unit has active leases
    const { data: leases, error: leaseError } = await supabase
      .from('Lease')
      .select('id')
      .eq('unitId', id)
      .eq('status', 'ACTIVE')
      .limit(1)

    if (leaseError) {
      toast.error(leaseError.message)
      throw leaseError
    }

    if (leases && leases.length > 0) {
      toast.error('Cannot delete unit with active leases')
      throw new Error('Unit has active leases')
    }

    const { error } = await supabase
      .from('Unit')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Unit deleted successfully')
  }

  return { deleteUnit }
}

// Bulk status update
export function useBulkUpdateUnitStatus() {
  const bulkUpdate = async (unitIds: string[], status: UnitData['status']) => {
    const { error } = await supabase
      .from('Unit')
      .update({ status })
      .in('id', unitIds)

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success(`${unitIds.length} units updated successfully`)
  }

  return { bulkUpdate }
}

// Real-time subscription for unit updates
export function useRealtimeUnits(propertyId?: string, onUpdate?: (payload: unknown) => void) {
  const { user } = useAuth()

  if (!user?.id) return

  const filters: Record<string, string> = {}
  if (propertyId) {
    filters.propertyId = `eq.${propertyId}`
  }

  const channel = supabase
    .channel('units-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'Unit',
        filter: propertyId ? `propertyId=eq.${propertyId}` : undefined
      },
      (payload) => {
        console.log('Unit change:', payload)
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
export function useUnitActions() {
  const units = useSupabaseUnits()
  const { create } = useCreateUnit()
  const { update } = useUpdateUnit()
  const { deleteUnit } = useDeleteUnit()
  const { bulkUpdate } = useBulkUpdateUnitStatus()

  return {
    // Data
    units: units.units,
    total: units.totalCount,
    vacantCount: units.vacantCount,
    occupiedCount: units.occupiedCount,
    
    // Loading states
    isLoading: units.isLoading,
    isFetching: units.isFetching,
    
    // Pagination
    hasMore: units.hasMore,
    fetchNextPage: units.fetchNextPage,
    
    // Mutations
    create,
    update,
    delete: deleteUnit,
    bulkUpdateStatus: bulkUpdate,
    
    // Utility
    refresh: () => units.fetchNextPage()
  }
}