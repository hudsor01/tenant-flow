import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { honoClient } from '@/lib/clients/hono-client'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import { handleApiError } from '@/lib/utils'
import type { 
    CreatePropertyInput, 
    UpdatePropertyInput
} from '@tenantflow/shared'
import { PropertyQueryInput } from '@tenantflow/shared/types/api-inputs'

// Properties queries
export function useProperties(params?: PropertyQueryInput) {
    const { user } = useAuth()
    
    return useQuery({
        queryKey: ['properties', 'list', params],
        queryFn: async () => {
            const response = await honoClient.api.v1.properties.$get({ 
                query: params || {} 
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to fetch properties')
            }
            return response.json()
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })
}

export function useProperty(id: string) {
    const { user } = useAuth()
    
    return useQuery({
        queryKey: ['properties', 'byId', id],
        queryFn: async () => {
            const response = await honoClient.api.v1.properties[':id'].$get({ 
                param: { id } 
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to fetch property')
            }
            return response.json()
        },
        enabled: !!id && !!user,
        staleTime: 5 * 60 * 1000,
    })
}

export function usePropertyStats() {
    const { user } = useAuth()
    
    return useQuery({
        queryKey: ['properties', 'stats'],
        queryFn: async () => {
            const response = await honoClient.api.v1.properties.stats.$get()
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to fetch property stats')
            }
            return response.json()
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    })
}

// Properties mutations
export function useCreateProperty() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (data: CreatePropertyInput) => {
            const response = await honoClient.api.v1.properties.$post({ json: data })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to create property')
            }
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            toast.success('Property created successfully')
        },
        onError: (error) => {
            toast.error(handleApiError(error as Error))
        }
    })
}

export function useUpdateProperty() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (data: UpdatePropertyInput & { id: string }) => {
            const { id, ...updateData } = data
            const response = await honoClient.api.v1.properties[':id'].$put({ 
                param: { id },
                json: updateData 
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to update property')
            }
            return response.json()
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            queryClient.invalidateQueries({ queryKey: ['properties', 'byId', variables.id] })
            toast.success('Property updated successfully')
        },
        onError: (error) => {
            toast.error(handleApiError(error as Error))
        }
    })
}

export function useDeleteProperty() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await honoClient.api.v1.properties[':id'].$delete({ param: { id } })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to delete property')
            }
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] })
            toast.success('Property deleted successfully')
        },
        onError: (error) => {
            toast.error(handleApiError(error as Error))
        }
    })
}

export function useUploadPropertyImage() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (data: { 
            propertyId: string; 
            file: { data: string; filename: string; mimeType: string; size: number } 
        }) => {
            const response = await honoClient.api.v1.properties.uploadImage.$post({ json: data })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to upload image')
            }
            return response.json()
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ 
                queryKey: ['properties', 'byId', variables.propertyId] 
            })
            toast.success('Image uploaded successfully')
        },
        onError: (error) => {
            toast.error(handleApiError(error as Error))
        }
    })
}

// Composite hook for property actions
export function usePropertyActions() {
    const list = useProperties()
    const stats = usePropertyStats()
    const create = useCreateProperty()
    const update = useUpdateProperty()
    const remove = useDeleteProperty()
    const uploadImage = useUploadPropertyImage()
    
    return {
        // Data
        properties: list.data?.properties || [],
        total: list.data?.total || 0,
        stats: stats.data,
        
        // Loading states
        isLoading: list.isLoading,
        isLoadingStats: stats.isLoading,
        
        // Mutations
        create: create.mutate,
        update: update.mutate,
        delete: remove.mutate,
        uploadImage: uploadImage.mutate,
        
        // Mutation states
        isCreating: create.isPending,
        isUpdating: update.isPending,
        isDeleting: remove.isPending,
        isUploading: uploadImage.isPending,
        
        // Any loading
        anyLoading: list.isLoading || stats.isLoading || 
                   create.isPending || update.isPending || 
                   remove.isPending || uploadImage.isPending
    }
}