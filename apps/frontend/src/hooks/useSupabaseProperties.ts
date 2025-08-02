import { useInfiniteQuery, type SupabaseTableData } from './use-infinite-query'
import { supabaseSafe } from '@/lib/clients'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Type-safe property data
type PropertyData = SupabaseTableData<'Property'>

interface UseSupabasePropertiesOptions {
  pageSize?: number
  sortBy?: 'createdAt' | 'name' | 'city'
  sortOrder?: 'asc' | 'desc'
  filterByCity?: string
  filterByType?: string
}

export function useSupabaseProperties(options: UseSupabasePropertiesOptions = {}) {
  const { user } = useAuth()
  const {
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    filterByCity,
    filterByType
  } = options

  const query = useInfiniteQuery<PropertyData>({
    tableName: 'Property',
    columns: '*, Unit(count)',
    pageSize,
    trailingQuery: (query) => {
      let modifiedQuery = query

      // Apply user filter - only show properties owned by current user
      if (user?.id) {
        modifiedQuery = modifiedQuery.eq('ownerId', user.id)
      }

      // Apply filters
      if (filterByCity) {
        modifiedQuery = modifiedQuery.eq('city', filterByCity)
      }
      if (filterByType) {
        modifiedQuery = modifiedQuery.eq('propertyType', filterByType)
      }

      // Apply sorting
      modifiedQuery = modifiedQuery.order(sortBy, { ascending: sortOrder === 'asc' })

      return modifiedQuery
    }
  })

  return {
    ...query,
    properties: query.data,
    totalCount: query.count,
    isEmpty: query.data.length === 0 && !query.isLoading
  }
}

// Mutations using Supabase directly
export function useCreateProperty() {
  const { user } = useAuth()

  const create = async (data: Omit<PropertyData, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    const { data: property, error } = await supabaseSafe
      .from('Property')
      .insert({
        ...data,
        ownerId: user.id
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Property created successfully')
    return property
  }

  return { create }
}

export function useUpdateProperty() {
  const update = async (id: string, data: Partial<PropertyData>) => {
    const { data: property, error } = await supabaseSafe
      .from('Property')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Property updated successfully')
    return property
  }

  return { update }
}

export function useDeleteProperty() {
  const deleteProperty = async (id: string) => {
    const { error } = await supabaseSafe
      .from('Property')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Property deleted successfully')
  }

  return { deleteProperty }
}

// Image upload using Supabase Storage
export function useUploadPropertyImage() {
  const uploadImage = async (propertyId: string, file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${propertyId}/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseSafe.storage
      .from('property-images')
      .upload(fileName, file)

    if (uploadError) {
      toast.error(uploadError.message)
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseSafe.storage
      .from('property-images')
      .getPublicUrl(fileName)

    // Update property with image URL
    const { error: updateError } = await supabaseSafe
      .from('Property')
      .update({ imageUrl: publicUrl })
      .eq('id', propertyId)

    if (updateError) {
      toast.error(updateError.message)
      throw updateError
    }

    toast.success('Image uploaded successfully')
    return publicUrl
  }

  return { uploadImage }
}

// Real-time subscription for property updates
export function useRealtimeProperties(onUpdate?: (payload: unknown) => void) {
  const { user } = useAuth()

  if (!user?.id) return

  const supabase = supabaseSafe.getRawClient()
  const channel = supabase
    .channel('properties-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'Property',
        filter: `ownerId=eq.${user.id}`
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (onUpdate) {
          onUpdate(payload)
        }
      }
    )
    .subscribe()

  return () => {
    void supabaseSafe.getRawClient().removeChannel(channel)
  }
}

// Composite hook that combines everything
export function usePropertyActions() {
  const properties = useSupabaseProperties()
  const { create } = useCreateProperty()
  const { update } = useUpdateProperty()
  const { deleteProperty } = useDeleteProperty()
  const { uploadImage } = useUploadPropertyImage()

  return {
    // Data
    properties: properties.properties,
    total: properties.totalCount,
    
    // Loading states
    isLoading: properties.isLoading,
    isFetching: properties.isFetching,
    
    // Pagination
    hasMore: properties.hasMore,
    fetchNextPage: properties.fetchNextPage,
    
    // Mutations
    create,
    update,
    delete: deleteProperty,
    uploadImage,
    
    // Utility
    refresh: () => properties.fetchNextPage()
  }
}