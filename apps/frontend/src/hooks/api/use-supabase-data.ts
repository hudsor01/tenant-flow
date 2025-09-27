/**
 * Supabase data hooks using React Query
 * Direct integration without backend API layer
 * Replaces all api-client.ts calls with native Supabase queries
 */
import { createClient } from '@/utils/supabase/client'
import type { Database } from '@repo/shared'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const supabase = createClient()

// Type aliases from Supabase generated types
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

/**
 * Units Hooks
 */
export function useUnits(propertyId?: string, status?: string) {
  return useQuery({
    queryKey: ['units', propertyId, status],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('Unit')
        .select(`
          *,
          Property(id, name, address),
          Leases:Lease(
            id,
            tenantId,
            status,
            startDate,
            endDate,
            monthlyRent,
            Tenant(name, email, phone)
          )
        `)

      // Filter by property if specified
      if (propertyId) {
        query = query.eq('propertyId', propertyId)
      }

      // Filter by status if specified
      if (status) {
        query = query.eq('status', status)
      }

      // Apply RLS via property ownership
      const { data: properties } = await supabase
        .from('Property')
        .select('id')
        .eq('ownerId', user.id)

      if (!properties?.length) return []

      const propertyIds = properties.map(p => p.id)
      query = query.in('propertyId', propertyIds)

      const { data, error } = await query.order('unitNumber')
      if (error) throw error

      return data || []
    },
    staleTime: 30 * 1000,
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: TablesInsert<'Unit'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Verify property ownership
      const { data: property } = await supabase
        .from('Property')
        .select('id')
        .eq('id', values.propertyId)
        .eq('ownerId', user.id)
        .single()

      if (!property) throw new Error('Property not found or unauthorized')

      const { data, error } = await supabase
        .from('Unit')
        .insert(values)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Unit created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create unit', { description: error.message })
    }
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<'Unit'> }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get unit with property to verify ownership
      const { data: unit } = await supabase
        .from('Unit')
        .select('*, Property!inner(ownerId)')
        .eq('id', id)
        .single()

      if (!unit || unit.Property.ownerId !== user.id) {
        throw new Error('Unit not found or unauthorized')
      }

      const { data, error } = await supabase
        .from('Unit')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Unit updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update unit', { description: error.message })
    }
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Verify ownership via property
      const { data: unit } = await supabase
        .from('Unit')
        .select('*, Property!inner(ownerId)')
        .eq('id', id)
        .single()

      if (!unit || unit.Property.ownerId !== user.id) {
        throw new Error('Unit not found or unauthorized')
      }

      const { error } = await supabase
        .from('Unit')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Unit deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete unit', { description: error.message })
    }
  })
}

/**
 * Leases Hooks
 */
export function useLeases(status?: string) {
  return useQuery({
    queryKey: ['leases', status],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('Lease')
        .select(`
          *,
          Tenant(id, name, email, phone),
          Unit(
            id,
            unitNumber,
            Property(id, name, address, ownerId)
          )
        `)

      if (status) {
        query = query.eq('status', status)
      }

      // Filter by property ownership
      const { data, error } = await query

      if (error) throw error

      // Client-side filter for ownership (since we can't filter nested relations directly)
      const ownedLeases = (data || []).filter(
        lease => lease.Unit?.Property?.ownerId === user.id
      )

      return ownedLeases
    },
    staleTime: 30 * 1000,
  })
}

export function useCreateLease() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: TablesInsert<'Lease'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Verify unit ownership
      const { data: unit } = await supabase
        .from('Unit')
        .select('*, Property!inner(ownerId)')
        .eq('id', values.unitId)
        .single()

      if (!unit || unit.Property.ownerId !== user.id) {
        throw new Error('Unit not found or unauthorized')
      }

      const { data, error } = await supabase
        .from('Lease')
        .insert(values)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Lease created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create lease', { description: error.message })
    }
  })
}

export function useUpdateLease() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<'Lease'> }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Verify ownership via unit and property
      const { data: lease } = await supabase
        .from('Lease')
        .select('*, Unit!inner(*, Property!inner(ownerId))')
        .eq('id', id)
        .single()

      if (!lease || lease.Unit.Property.ownerId !== user.id) {
        throw new Error('Lease not found or unauthorized')
      }

      const { data, error } = await supabase
        .from('Lease')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      toast.success('Lease updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update lease', { description: error.message })
    }
  })
}

export function useDeleteLease() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Verify ownership
      const { data: lease } = await supabase
        .from('Lease')
        .select('*, Unit!inner(*, Property!inner(ownerId))')
        .eq('id', id)
        .single()

      if (!lease || lease.Unit.Property.ownerId !== user.id) {
        throw new Error('Lease not found or unauthorized')
      }

      const { error } = await supabase
        .from('Lease')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      toast.success('Lease deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete lease', { description: error.message })
    }
  })
}

/**
 * Maintenance Hooks
 */
export function useMaintenanceRequests(status?: string, propertyId?: string) {
  return useQuery({
    queryKey: ['maintenance', status, propertyId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('MaintenanceRequest')
        .select(`
          *,
          Unit(
            id,
            unitNumber,
            Property(id, name, address, ownerId)
          ),
          Tenant(id, name, email, phone)
        `)

      if (status) {
        query = query.eq('status', status)
      }

      if (propertyId) {
        query = query.eq('Unit.Property.id', propertyId)
      }

      const { data, error } = await query.order('createdAt', { ascending: false })

      if (error) throw error

      // Filter by ownership
      const ownedRequests = (data || []).filter(
        request => request.Unit?.Property?.ownerId === user.id
      )

      return ownedRequests
    },
    staleTime: 30 * 1000,
  })
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: TablesInsert<'MaintenanceRequest'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Verify unit ownership
      const { data: unit } = await supabase
        .from('Unit')
        .select('*, Property!inner(ownerId)')
        .eq('id', values.unitId)
        .single()

      if (!unit || unit.Property.ownerId !== user.id) {
        throw new Error('Unit not found or unauthorized')
      }

      const { data, error } = await supabase
        .from('MaintenanceRequest')
        .insert(values)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Maintenance request created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create maintenance request', { description: error.message })
    }
  })
}

export function useUpdateMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<'MaintenanceRequest'> }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Verify ownership
      const { data: request } = await supabase
        .from('MaintenanceRequest')
        .select('*, Unit!inner(*, Property!inner(ownerId))')
        .eq('id', id)
        .single()

      if (!request || request.Unit.Property.ownerId !== user.id) {
        throw new Error('Request not found or unauthorized')
      }

      const { data, error } = await supabase
        .from('MaintenanceRequest')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Maintenance request updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update maintenance request', { description: error.message })
    }
  })
}

export function useCompleteMaintenanceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, actualCost, notes }: { id: string; actualCost?: number; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Verify ownership
      const { data: request } = await supabase
        .from('MaintenanceRequest')
        .select('*, Unit!inner(*, Property!inner(ownerId))')
        .eq('id', id)
        .single()

      if (!request || request.Unit.Property.ownerId !== user.id) {
        throw new Error('Request not found or unauthorized')
      }

      const { data, error } = await supabase
        .from('MaintenanceRequest')
        .update({
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          actualCost,
          notes: notes ? `${request.notes || ''}\n\nCompletion Notes: ${notes}` : request.notes
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Maintenance request completed')
    },
    onError: (error: Error) => {
      toast.error('Failed to complete maintenance request', { description: error.message })
    }
  })
}

/**
 * Dashboard & Analytics Hooks
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Use RPC function for aggregated dashboard stats
      const { data, error } = await supabase
        .rpc('get_dashboard_summary', {
          p_user_id: user.id
        })

      if (error) {
        // Dashboard RPC not available, using fallback
        // Fallback to manual aggregation if RPC doesn't exist
        const [properties, tenants, units, leases] = await Promise.all([
          supabase.from('Property').select('id').eq('ownerId', user.id),
          supabase.from('Tenant').select('id').eq('userId', user.id),
          supabase.from('Unit').select('id, status, Property!inner(ownerId)').eq('Property.ownerId', user.id),
          supabase.from('Lease').select('id, status, monthlyRent, Unit!inner(Property!inner(ownerId))').eq('Unit.Property.ownerId', user.id)
        ])

        const activeLeases = leases.data?.filter(l => l.status === 'ACTIVE') || []
        const monthlyRevenue = activeLeases.reduce((sum, l) => sum + (l.monthlyRent || 0), 0)

        return {
          properties: {
            total: properties.data?.length || 0,
            active: properties.data?.length || 0,
            maintenance: 0
          },
          tenants: {
            total: tenants.data?.length || 0,
            active: activeLeases.length,
            new: 0
          },
          units: {
            total: units.data?.length || 0,
            occupied: units.data?.filter(u => u.status === 'OCCUPIED').length || 0,
            vacant: units.data?.filter(u => u.status === 'VACANT').length || 0
          },
          revenue: {
            monthly: monthlyRevenue,
            annual: monthlyRevenue * 12,
            growth: 0
          },
          occupancyRate: units.data?.length ?
            ((units.data.filter(u => u.status === 'OCCUPIED').length / units.data.length) * 100) : 0
        }
      }

      return data
    },
    staleTime: 60 * 1000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Financial Hooks using RPC functions
 */
export function useFinancialMetrics(year?: number) {
  const targetYear = year || new Date().getFullYear()

  return useQuery({
    queryKey: ['financial', 'metrics', targetYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .rpc('calculate_financial_metrics', {
          p_user_id: user.id,
          p_start_date: `${targetYear}-01-01`,
          p_end_date: `${targetYear}-12-31`
        })

      if (error) {
        // Financial RPC not available, using fallback
        // Fallback calculation
        return {
          totalRevenue: 0,
          totalExpenses: 0,
          netIncome: 0,
          monthlyData: []
        }
      }

      return data
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Query key factory for consistent cache management
 */
export const queryKeys = {
  all: ['supabase'] as const,
  properties: () => ['properties'] as const,
  property: (id: string) => ['properties', id] as const,
  tenants: () => ['tenants'] as const,
  tenant: (id: string) => ['tenants', id] as const,
  units: (propertyId?: string) => ['units', propertyId] as const,
  unit: (id: string) => ['units', id] as const,
  leases: (status?: string) => ['leases', status] as const,
  lease: (id: string) => ['leases', id] as const,
  maintenance: (status?: string, propertyId?: string) => ['maintenance', status, propertyId] as const,
  dashboard: () => ['dashboard'] as const,
  financial: (year?: number) => ['financial', year] as const,
}