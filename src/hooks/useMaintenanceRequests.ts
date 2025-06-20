import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { MaintenanceRequestWithRelations } from '../types/relationships'

export function useMaintenanceRequests() {
  const { user } = useAuthStore()

  return useQuery({
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