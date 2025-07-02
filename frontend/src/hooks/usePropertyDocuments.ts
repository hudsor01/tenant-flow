import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { useAuthStore } from '../store/authStore'
import { uploadPropertyImage, deletePropertyDocument } from '../lib/storage-utils'
import type { Document } from '@/types/entities'

export interface PropertyDocument extends Document {
  // Additional properties for UI
  isUploading?: boolean
  progress?: number
}

/**
 * Get all documents for a specific property
 * TODO: Implement document API endpoints
 */
export function usePropertyDocuments(propertyId: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['property-documents', propertyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      // TODO: Replace with API call when document endpoints are available
      // For now, return empty array
      return [] as PropertyDocument[]
    },
    enabled: !!user?.id && !!propertyId,
  })
}

/**
 * Get property images specifically
 * TODO: Implement image API endpoints
 */
export function usePropertyImages(propertyId: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['property-images', propertyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      // TODO: Replace with API call when image endpoints are available
      // For now, return empty array
      return [] as PropertyDocument[]
    },
    enabled: !!user?.id && !!propertyId,
  })
}

/**
 * Upload property images
 */
export function useUploadPropertyImages() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ 
      files, 
      propertyId, 
      setPrimaryIndex 
    }: { 
      files: File[]
      propertyId: string
      setPrimaryIndex?: number
    }) => {
      if (!user) throw new Error('No user authenticated')

      // Use the API client for image upload
      const uploadPromises = files.map(async (file, index) => {
        const isPrimary = setPrimaryIndex === index
        const result = await apiClient.properties.uploadImage(propertyId, file)
        
        // If this is the primary image, update the property
        if (isPrimary) {
          await apiClient.properties.update(propertyId, { imageUrl: result.url })
        }
        
        return result
      })

      const results = await Promise.all(uploadPromises)
      return results
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['property-documents', variables.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['property-images', variables.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['property', variables.propertyId] })
    },
  })
}

/**
 * Delete a property document
 * TODO: Implement document deletion API
 */
export function useDeletePropertyDocument() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ 
      documentId, 
      propertyId 
    }: { 
      documentId: string
      propertyId: string
    }) => {
      if (!user?.id) throw new Error('No user ID')

      // TODO: Replace with API call when document deletion endpoints are available
      console.log('Would delete document:', { documentId, propertyId })
      return { documentId, propertyId }
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['property-documents', result.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['property-images', result.propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['property', result.propertyId] })
    },
  })
}

/**
 * Set primary property image
 */
export function useSetPrimaryPropertyImage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ 
      documentId, 
      propertyId, 
      imageUrl 
    }: { 
      documentId: string
      propertyId: string
      imageUrl: string
    }) => {
      if (!user?.id) throw new Error('No user ID')

      // Update property primary image using the API
      await apiClient.properties.update(propertyId, { imageUrl })

      return { documentId, propertyId, imageUrl }
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['property', result.propertyId] })
    },
  })
}

/**
 * Create storage bucket for property images if it doesn't exist
 * TODO: Implement storage initialization in API
 */
export function useEnsurePropertyImagesBucket() {
  return useMutation({
    mutationFn: async () => {
      // TODO: Replace with API call when storage initialization is available
      console.log('Storage bucket initialization would happen here')
      return { success: true }
    },
  })
}