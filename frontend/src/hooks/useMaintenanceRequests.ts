import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { maintenanceApi } from '../services/api'
import { logger } from '@/lib/logger'
import { MaintenanceRequestWithRelations } from '../types/relationships'
import type { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto } from '../services/api'

export function useMaintenanceRequests() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['maintenanceRequests', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      // Try API first, fallback to Supabase if not available
      try {
        const response = await maintenanceApi.getMaintenanceRequests()
        if (response.success && response.data) {
          return response.data as MaintenanceRequestWithRelations[]
        }
      } catch (error) {
        console.warn('API not available, falling back to Supabase', error)
      }

      // Fallback to Supabase for now
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
            recordId: (payload.new as { id?: string })?.id ?? (payload.old as { id?: string })?.id 
          })

          // Invalidate and refetch the maintenance requests query to get fresh data with relations
          queryClient.invalidateQueries({ 
            queryKey: ['maintenanceRequests', user.id] 
          })
        }
      )
      .subscribe()

    return () => {
      logger.debug('Cleaning up real-time subscription for maintenance requests')
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

      // Try API first, fallback to Supabase if not available
      try {
        const createData: CreateMaintenanceRequestDto = {
          unitId: data.unitId,
          title: data.title,
          description: data.description,
          priority: data.priority || 'MEDIUM',
          status: 'OPEN',
        }

        const response = await maintenanceApi.createMaintenanceRequest(createData)
        if (response.success && response.data) {
          return response.data
        }
      } catch (error) {
        console.warn('API not available, falling back to Supabase', error)
      }

      // Fallback to Supabase for now
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

      // Try API first, fallback to Supabase if not available
      try {
        const updateData: UpdateMaintenanceRequestDto = {
          status: data.status,
          priority: data.priority,
          title: data.title,
          description: data.description,
        }

        const response = await maintenanceApi.updateMaintenanceRequest(id, updateData)
        if (response.success && response.data) {
          return response.data
        }
      } catch (error) {
        console.warn('API not available, falling back to Supabase', error)
      }

      // Fallback to Supabase for now
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