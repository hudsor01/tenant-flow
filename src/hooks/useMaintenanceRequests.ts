import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { logger } from '@/lib/logger'
import { MaintenanceRequestWithRelations } from '../types/relationships'

export function useMaintenanceRequests() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['maintenanceRequests', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      // First get all maintenance requests with unit and property data
      const { data, error } = await supabase
        .from('MaintenanceRequest')
        .select(`
          *,
          unit:Unit (
            id,
            unitNumber,
            property:Property (
              id,
              name,
              address,
              ownerId
            )
          )
        `)
        .order('createdAt', { ascending: false })

      if (error) {
        // Handle empty result gracefully
        if (error.code === 'PGRST116') {
          return []
        }
        throw error
      }

      // RLS automatically filters to only maintenance requests for user's properties
      return data as MaintenanceRequestWithRelations[]
    },
    enabled: !!user?.id,
  })

  // Set up real-time subscription for maintenance requests
  useEffect(() => {
    if (!user?.id) return

    logger.info('Setting up real-time subscription for maintenance requests', undefined, { userId: user.id })

    const channel = supabase
      .channel('maintenance-requests-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'MaintenanceRequest',
          filter: `ownerId=eq.${user.id}`
        }, 
        (payload) => {
          logger.debug('Maintenance request real-time change detected', undefined, { 
            eventType: payload.eventType, 
            recordId: payload.new?.id || payload.old?.id 
          })

          // Invalidate and refetch the maintenance requests query to get fresh data with relations
          queryClient.invalidateQueries({ 
            queryKey: ['maintenanceRequests', user.id] 
          })
        }
      )
      .subscribe()

    return () => {
      logger.debug('Cleaning up real-time subscription for maintenance requests', undefined, { userId: user.id })
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  return query
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: {
      unitId: string
      title: string
      description: string
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
    }) => {
      if (!user?.id) throw new Error('No user ID')

      const { data: request, error } = await supabase
        .from('MaintenanceRequest')
        .insert({
          unitId: data.unitId,
          title: data.title,
          description: data.description,
          priority: data.priority || 'MEDIUM',
          status: 'OPEN',
        })
        .select()
        .single()

      if (error) throw error
      return request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] })
    },
  })
}

export function useUpdateMaintenanceRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string
      data: {
        status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
        title?: string
        description?: string
      }
    }) => {
      if (!user?.id) throw new Error('No user ID')

      const { data: request, error } = await supabase
        .from('MaintenanceRequest')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] })
    },
  })
}