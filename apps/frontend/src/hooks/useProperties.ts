import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, handleApiError } from '@/lib/api/axios-client'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import { useAuth } from './useAuth'
import type { 
    CreatePropertyInput, 
    UpdatePropertyInput,
    PropertyQueryInput,
    Property,
    PropertyStats,
    PropertyListResponse,
    PropertyStatsResponse,
    ApiResponse,
    SuccessResponse
} from '@tenantflow/shared'

// Properties queries
export function useProperties(params?: PropertyQueryInput) {
    const { user } = useAuth()
    
    return useQuery({
        queryKey: ['properties', 'list', params],
        queryFn: async () => {
            const response = await api.properties.list(params)
            return response.data as PropertyListResponse
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
            const response = await api.properties.get(id)
            return response.data as Property
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
            const response = await api.properties.stats()
            return response.data as PropertyStatsResponse
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
            const response = await api.properties.create(data)
            return response.data as Property
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] }).catch(() => {
                // Invalidation failed, queries will stay stale
            })
            toast.success(toastMessages.success.created('property'))
        },
        onError: (error) => {
            toast.error(handleApiError(error))
        }
    })
}

export function useUpdateProperty() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (data: UpdatePropertyInput & { id: string }) => {
            const { id, ...updateData } = data
            const response = await api.properties.update(id, updateData)
            return response.data as Property
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['properties'] }).catch(() => {
                // Invalidation failed, queries will stay stale
            })
            queryClient.invalidateQueries({ queryKey: ['properties', 'byId', variables.id] }).catch(() => {
                // Invalidation failed, queries will stay stale
            })
            toast.success(toastMessages.success.updated('property'))
        },
        onError: (error) => {
            toast.error(handleApiError(error))
        }
    })
}

export function useDeleteProperty() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.properties.delete(id)
            return response.data as SuccessResponse<{ message: string }>
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] }).catch(() => {
                // Invalidation failed, queries will stay stale
            })
            toast.success(toastMessages.success.deleted('property'))
        },
        onError: (error) => {
            toast.error(handleApiError(error))
        }
    })
}

export function useUploadPropertyImage() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: async (data: { 
            propertyId: string; 
            file: File
        }) => {
            const formData = new FormData()
            formData.append('file', data.file)
            
            const response = await api.properties.uploadImage(data.propertyId, formData)
            return response.data as SuccessResponse<{ imageUrl: string; message: string }>
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ 
                queryKey: ['properties', 'byId', variables.propertyId] 
            }).catch(() => {
                // Invalidation failed, queries will stay stale
            })
            toast.success(toastMessages.success.uploaded('image'))
        },
        onError: (error) => {
            toast.error(handleApiError(error))
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
        properties: (list.data as PropertyListResponse)?.properties || [],
        total: (list.data as PropertyListResponse)?.totalCount || 0,
        stats: stats.data as PropertyStatsResponse,
        
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
