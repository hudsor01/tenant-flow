import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys, handleApiError } from '../lib/utils'
import type {
  PropertyWithDetails,
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyStats,
  PropertyQuery,
} from '../types/api'
import { toast } from 'sonner'

// Properties list hook
export function useProperties(query?: PropertyQuery) {
  return useQuery({
    queryKey: queryKeys.properties.list(query),
    queryFn: () => apiClient.properties.getAll(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Single property hook
export function useProperty(id: string) {
  return useQuery({
    queryKey: queryKeys.properties.detail(id),
    queryFn: () => apiClient.properties.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && apiClient.auth.isAuthenticated(),
  })
}

// Property statistics hook
export function usePropertyStats() {
  return useQuery({
    queryKey: queryKeys.properties.stats(),
    queryFn: () => apiClient.properties.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Create property mutation
export function useCreateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePropertyDto) => apiClient.properties.create(data),
    onSuccess: (newProperty: PropertyWithDetails) => {
      // Invalidate and refetch properties list
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.stats() })
      
      // Add the new property to cache
      queryClient.setQueryData(
        queryKeys.properties.detail(newProperty.id),
        newProperty
      )
      
      toast.success('Property created successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Update property mutation
export function useUpdateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePropertyDto }) =>
      apiClient.properties.update(id, data),
    onSuccess: (updatedProperty: PropertyWithDetails) => {
      // Update the property in cache
      queryClient.setQueryData(
        queryKeys.properties.detail(updatedProperty.id),
        updatedProperty
      )
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.stats() })
      
      toast.success('Property updated successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Delete property mutation
export function useDeleteProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.properties.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove property from cache
      queryClient.removeQueries({ queryKey: queryKeys.properties.detail(deletedId) })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.stats() })
      
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.units.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.lists() })
      
      toast.success('Property deleted successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Upload property image mutation
export function useUploadPropertyImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      apiClient.properties.uploadImage(id, file),
    onSuccess: (_, { id }) => {
      // Invalidate property to refetch with new image
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() })
      
      toast.success('Property image uploaded successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Combined hook for property management
export function usePropertyActions() {
  const createProperty = useCreateProperty()
  const updateProperty = useUpdateProperty()
  const deleteProperty = useDeleteProperty()
  const uploadImage = useUploadPropertyImage()

  return {
    create: createProperty,
    update: updateProperty,
    delete: deleteProperty,
    uploadImage,
    isLoading:
      createProperty.isPending ||
      updateProperty.isPending ||
      deleteProperty.isPending ||
      uploadImage.isPending,
  }
}