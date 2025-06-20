import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
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
 */
export function usePropertyDocuments(propertyId: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['property-documents', propertyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      // Get documents for this property, ensuring user owns the property
      const { data, error } = await supabase
        .from('Document')
        .select(`
          *,
          property:Property!inner (
            id,
            name,
            ownerId
          )
        `)
        .eq('propertyId', propertyId)
        .eq('property.ownerId', user.id)
        .order('createdAt', { ascending: false })

      if (error) {
        if (error.code === 'PGRST116') {
          return []
        }
        throw error
      }

      return data as PropertyDocument[]
    },
    enabled: !!user?.id && !!propertyId,
  })
}

/**
 * Get property images specifically
 */
export function usePropertyImages(propertyId: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['property-images', propertyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      const { data, error } = await supabase
        .from('Document')
        .select(`
          *,
          property:Property!inner (
            id,
            name,
            ownerId
          )
        `)
        .eq('propertyId', propertyId)
        .eq('type', 'PROPERTY_PHOTO')
        .eq('property.ownerId', user.id)
        .order('createdAt', { ascending: false })

      if (error) {
        if (error.code === 'PGRST116') {
          return []
        }
        throw error
      }

      return data as PropertyDocument[]
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

      const uploadPromises = files.map(async (file, index) => {
        const isPrimary = setPrimaryIndex === index
        return await uploadPropertyImage(file, propertyId, user, isPrimary)
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

      // Verify user owns the property before allowing deletion
      const { data: property, error: propertyError } = await supabase
        .from('Property')
        .select('id, ownerId')
        .eq('id', propertyId)
        .eq('ownerId', user.id)
        .single()

      if (propertyError || !property) {
        throw new Error('Property not found or unauthorized')
      }

      await deletePropertyDocument(documentId)
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

      // Verify user owns the property
      const { data: property, error: propertyError } = await supabase
        .from('Property')
        .select('id, ownerId')
        .eq('id', propertyId)
        .eq('ownerId', user.id)
        .single()

      if (propertyError || !property) {
        throw new Error('Property not found or unauthorized')
      }

      // Update property primary image
      const { error } = await supabase
        .from('Property')
        .update({ imageUrl })
        .eq('id', propertyId)

      if (error) throw error

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
 */
export function useEnsurePropertyImagesBucket() {
  return useMutation({
    mutationFn: async () => {
      // Try to create the bucket - will fail silently if it already exists
      const { error } = await supabase.storage.createBucket('property-images', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 10 * 1024 * 1024 // 10MB
      })

      if (error && !error.message.includes('already exists')) {
        throw error
      }

      return { success: true }
    },
  })
}