import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { useAuthStore } from '../store/authStore'
import type { PropertyWithUnits } from '@/types/relationships'
import type { CreatePropertyDto, UpdatePropertyDto } from '@/types/api'
import { toast } from 'sonner'

// Safe version that avoids infinite recursion
export function useProperties() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      try {
        // Get properties with units using the new API
        const properties = await apiClient.properties.getAll()
        
        // Transform API response to match existing PropertyWithUnits interface
        const propertiesWithUnits: PropertyWithUnits[] = properties.map(property => ({
          ...property,
          units: property.units || []
        }))

        return propertiesWithUnits
      } catch (error) {
        console.error('Properties query failed:', error)
        return []
      }
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1, // Only retry once
  })
}

// Create property mutation
export function useCreateProperty() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (propertyData: CreatePropertyData) => {
      if (!user?.id) throw new Error('No user ID')

      return await apiClient.properties.create(propertyData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Property created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create property: ${error.message}`)
    }
  })
}

// Update property mutation
export function useUpdateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...propertyData }: { id: string } & UpdatePropertyDto) => {
      return await apiClient.properties.update(id, propertyData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Property updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update property: ${error.message}`)
    }
  })
}

// Delete property mutation
export function useDeleteProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (propertyId: string) => {
      await apiClient.properties.delete(propertyId)
      return propertyId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Property deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete property: ${error.message}`)
    }
  })
}