/**
 * React Query Factory Utilities
 * 
 * Consolidates common React Query patterns to eliminate duplication across hooks.
 * Based on official TanStack Query patterns from documentation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ============================================================================
// QUERY FACTORY TYPES
// ============================================================================

export interface QueryFactoryOptions<TData = unknown, TError = Error> {
  queryKey: readonly unknown[]
  queryFn: () => Promise<TData>
  enabled?: boolean
  refetchInterval?: number | false
  staleTime?: number
  gcTime?: number
  onSuccess?: (data: TData) => void
  onError?: (error: TError) => void
}

export interface MutationFactoryOptions<TData = unknown, TVariables = unknown, TError = Error> {
  mutationFn: (variables: TVariables) => Promise<TData>
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: TError, variables: TVariables) => void
  invalidateKeys?: readonly unknown[][]
  successMessage?: string
  errorMessage?: string
  optimisticUpdate?: {
    queryKey: readonly unknown[]
    updater: (oldData: unknown, variables: TVariables) => unknown
  }
}

// ============================================================================
// QUERY FACTORY
// ============================================================================

/**
 * Standardized query hook factory with consistent patterns
 */
export function useQueryFactory<TData = unknown, TError = Error>(
  options: QueryFactoryOptions<TData, TError>
) {
  const {
    queryKey,
    queryFn,
    enabled = true,
    refetchInterval,
    staleTime = 5 * 60 * 1000, // 5 minutes default
    gcTime = 10 * 60 * 1000, // 10 minutes default
    onSuccess,
    onError
  } = options

  return useQuery({
    queryKey,
    queryFn,
    enabled,
    refetchInterval,
    staleTime,
    gcTime,
    meta: {
      onSuccess,
      onError
    }
  })
}

// ============================================================================
// MUTATION FACTORY
// ============================================================================

/**
 * Standardized mutation hook factory with consistent patterns
 */
export function useMutationFactory<TData = unknown, TVariables = unknown, TError = Error>(
  options: MutationFactoryOptions<TData, TVariables, TError>
) {
  const queryClient = useQueryClient()
  
  const {
    mutationFn,
    onSuccess,
    onError,
    invalidateKeys = [],
    successMessage,
    errorMessage,
    optimisticUpdate
  } = options

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      // Optimistic update pattern
      if (optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey: optimisticUpdate.queryKey })
        const previousData = queryClient.getQueryData(optimisticUpdate.queryKey)
        queryClient.setQueryData(
          optimisticUpdate.queryKey, 
          optimisticUpdate.updater(previousData, variables)
        )
        return { previousData }
      }
    },
    onSuccess: (data: TData, variables: TVariables) => {
      // Invalidate related queries
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key })
      })

      // Show success toast
      if (successMessage) {
        toast.success(successMessage)
      }

      // Custom success callback
      onSuccess?.(data, variables)
    },
    onError: (error: TError, variables: TVariables, context?: { previousData?: unknown }) => {
      // Revert optimistic update on error
      if (optimisticUpdate && context?.previousData !== undefined) {
        queryClient.setQueryData(optimisticUpdate.queryKey, context.previousData)
      }

      // Show error toast
      if (errorMessage) {
        toast.error(errorMessage)
      } else {
        toast.error('An error occurred. Please try again.')
      }

      // Custom error callback
      onError?.(error, variables)
    }
  })
}

// ============================================================================
// CRUD FACTORY UTILITIES
// ============================================================================

/**
 * Creates standard CRUD mutation hooks for a resource
 */
export function useCrudMutations<TData = unknown, TCreateInput = unknown, TUpdateInput = unknown>(
  resource: string,
  api: {
    create: (input: TCreateInput) => Promise<TData>
    update: (id: string, input: TUpdateInput) => Promise<TData>
    delete: (id: string) => Promise<void>
  }
) {
  const listQueryKey = [resource, 'list'] as const
  const invalidateKeys = [listQueryKey]

  const createMutation = useMutationFactory({
    mutationFn: api.create,
    invalidateKeys,
    successMessage: `${resource} created successfully`,
    errorMessage: `Failed to create ${resource}`
  })

  const updateMutation = useMutationFactory({
    mutationFn: ({ id, input }: { id: string; input: TUpdateInput }) => api.update(id, input),
    invalidateKeys,
    successMessage: `${resource} updated successfully`, 
    errorMessage: `Failed to update ${resource}`
  })

  const deleteMutation = useMutationFactory({
    mutationFn: api.delete,
    invalidateKeys,
    successMessage: `${resource} deleted successfully`,
    errorMessage: `Failed to delete ${resource}`
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation
  }
}

// ============================================================================
// COMMON QUERY PATTERNS
// ============================================================================

/**
 * Standard list query with search/filter support
 */
export function useListQuery<TData = unknown>(
  resource: string,
  fetcher: (params?: Record<string, unknown>) => Promise<TData>,
  params?: Record<string, unknown>
) {
  return useQueryFactory({
    queryKey: [resource, 'list', params],
    queryFn: () => fetcher(params),
    enabled: true,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Standard detail query for individual resources
 */
export function useDetailQuery<TData = unknown>(
  resource: string,
  id: string | undefined,
  fetcher: (id: string) => Promise<TData>
) {
  return useQueryFactory({
    queryKey: [resource, 'detail', id],
    queryFn: () => fetcher(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000
  })
}

/**
 * Standard dashboard stats query with auto-refresh
 */
export function useStatsQuery<TData = unknown>(
  resource: string,
  fetcher: () => Promise<TData>,
  refetchInterval = 5 * 60 * 1000 // 5 minutes
) {
  return useQueryFactory({
    queryKey: [resource, 'stats'],
    queryFn: fetcher,
    enabled: true,
    refetchInterval,
    staleTime: 2 * 60 * 1000
  })
}