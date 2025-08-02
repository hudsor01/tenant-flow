import { useInfiniteQuery, type SupabaseTableData } from './use-infinite-query'
import { supabase } from '@/lib/clients'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Type-safe maintenance data
type MaintenanceData = SupabaseTableData<'MaintenanceRequest'>
type UnitData = SupabaseTableData<'Unit'>
type PropertyData = SupabaseTableData<'Property'>

// Extended maintenance type with relations - omit string relations and add object ones
type MaintenanceWithRelations = Omit<MaintenanceData, 'Unit'> & {
  Unit?: UnitData & {
    Property?: PropertyData
  }
}

interface UseSupabaseMaintenanceOptions {
  pageSize?: number
  propertyId?: string
  unitId?: string
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'ON_HOLD'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
}

export function useSupabaseMaintenance(options: UseSupabaseMaintenanceOptions = {}) {
  const { user } = useAuth()
  const {
    pageSize = 20,
    propertyId,
    unitId,
    status,
    priority
  } = options

  const query = useInfiniteQuery<MaintenanceWithRelations, 'MaintenanceRequest'>({
    tableName: 'MaintenanceRequest',
    columns: '*, Unit(*, Property(*))',
    pageSize,
    trailingQuery: (query) => {
      let modifiedQuery = query

      // Apply filters
      if (unitId) {
        modifiedQuery = modifiedQuery.eq('unitId', unitId)
      }
      if (status) {
        modifiedQuery = modifiedQuery.eq('status', status)
      }
      if (priority) {
        modifiedQuery = modifiedQuery.eq('priority', priority)
      }
      
      // Filter by property through unit relation
      if (propertyId) {
        modifiedQuery = modifiedQuery.eq('Unit.propertyId', propertyId)
      }

      // Only show maintenance requests for properties owned by current user
      if (user?.id) {
        modifiedQuery = modifiedQuery.eq('Unit.Property.ownerId', user.id)
      }

      // Sort by priority and creation date
      modifiedQuery = modifiedQuery
        .order('priority', { ascending: false })
        .order('createdAt', { ascending: false })

      return modifiedQuery
    }
  })

  return {
    ...query,
    requests: query.data,
    totalCount: query.count,
    isEmpty: query.data.length === 0 && !query.isLoading,
    openCount: query.data.filter(r => r.status === 'OPEN').length,
    inProgressCount: query.data.filter(r => r.status === 'IN_PROGRESS').length,
    urgentCount: query.data.filter(r => r.priority === 'EMERGENCY').length
  }
}

// Get urgent/emergency requests
export function useUrgentMaintenance() {
  const query = useInfiniteQuery<MaintenanceWithRelations, 'MaintenanceRequest'>({
    tableName: 'MaintenanceRequest',
    columns: '*, Unit(*, Property(*))',
    pageSize: 50, // Get more urgent items
    trailingQuery: (query) => {
      return query
        .eq('priority', 'EMERGENCY')
        .in('status', ['OPEN', 'IN_PROGRESS', 'ON_HOLD'])
        .order('priority', { ascending: false })
        .order('createdAt', { ascending: true })
    }
  })

  return {
    ...query,
    urgentRequests: query.data
  }
}

// Mutations
export function useCreateMaintenanceRequest() {
  const create = async (data: Omit<MaintenanceData, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!supabase) {
      throw new Error('Database connection not available')
    }
    const { data: request, error } = await supabase
      .from('MaintenanceRequest')
      .insert({
        ...data,
        status: data.status || 'OPEN'
      })
      .select('*, Unit(*, Property(*))')
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    // Send notification for emergency requests
    if (data.priority === 'EMERGENCY') {
      toast.warning('Emergency maintenance request created!', {
        description: 'Property manager has been notified.'
      })
    } else {
      toast.success('Maintenance request created successfully')
    }

    return request
  }

  return { create }
}

export function useUpdateMaintenanceRequest() {
  const update = async (id: string, data: Partial<MaintenanceData>) => {
    // If marking as completed, set completedAt
    if (data.status === 'COMPLETED' && !data.completedAt) {
      data.completedAt = new Date().toISOString()
    }

    if (!supabase) {
      throw new Error('Database connection not available')
    }
    const { data: request, error } = await supabase
      .from('MaintenanceRequest')
      .update(data)
      .eq('id', id)
      .select('*, Unit(*, Property(*))')
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Maintenance request updated successfully')
    return request
  }

  return { update }
}

export function useDeleteMaintenanceRequest() {
  const deleteRequest = async (id: string) => {
    if (!supabase) {
      throw new Error('Database connection not available')
    }
    const { error } = await supabase
      .from('MaintenanceRequest')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Maintenance request deleted successfully')
  }

  return { deleteRequest }
}

// Assign maintenance request
export function useAssignMaintenance() {
  const assign = async (id: string, assignedTo: string | null) => {
    if (!supabase) {
      throw new Error('Database connection not available')
    }
    const { error } = await supabase
      .from('MaintenanceRequest')
      .update({ 
        assignedTo,
        status: assignedTo ? 'IN_PROGRESS' : 'OPEN'
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success(
      assignedTo 
        ? 'Maintenance request assigned' 
        : 'Assignment removed'
    )
  }

  return { assign }
}

// Real-time subscription
export function useRealtimeMaintenance(onUpdate?: (payload: unknown) => void) {
  const { user } = useAuth()

  if (!user?.id) return

  if (!supabase) {
    console.warn('Supabase client not available for real-time subscriptions')
    return
  }

  const channel = supabase
    .channel('maintenance-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'MaintenanceRequest'
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        
        // Show notification for new emergency requests
        if (
          payload.eventType === 'INSERT' && 
          payload.new &&
          payload.new.priority === 'EMERGENCY'
        ) {
          toast.error('New emergency maintenance request!', {
            description: String(payload.new.title || 'Emergency request')
          })
        }
        
        if (onUpdate) {
          onUpdate(payload)
        }
      }
    )
    .subscribe()

  return () => {
    if (supabase) {
      void supabase.removeChannel(channel)
    }
  }
}

// Composite hook
export function useMaintenanceActions() {
  const maintenance = useSupabaseMaintenance()
  const urgent = useUrgentMaintenance()
  const { create } = useCreateMaintenanceRequest()
  const { update } = useUpdateMaintenanceRequest()
  const { deleteRequest } = useDeleteMaintenanceRequest()
  const { assign } = useAssignMaintenance()

  return {
    // Data
    requests: maintenance.requests,
    urgentRequests: urgent.urgentRequests,
    total: maintenance.totalCount,
    openCount: maintenance.openCount,
    inProgressCount: maintenance.inProgressCount,
    urgentCount: maintenance.urgentCount,
    
    // Loading states
    isLoading: maintenance.isLoading,
    isFetching: maintenance.isFetching,
    
    // Pagination
    hasMore: maintenance.hasMore,
    fetchNextPage: maintenance.fetchNextPage,
    
    // Mutations
    create,
    update,
    delete: deleteRequest,
    assign,
    
    // Utility
    refresh: () => maintenance.fetchNextPage()
  }
}