/**
 * Optimistic Update Patterns for React Query
 * Provides instant UI feedback while mutations are processing
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface OptimisticMutationOptions<TData, TVariables> {
	mutationFn: (variables: TVariables) => Promise<TData>
	queryKey: readonly unknown[]
	addOptimisticUpdate?: (
		oldData: TData[] | undefined,
		newItem: Partial<TData>
	) => TData[]
	updateOptimisticUpdate?: (
		oldData: TData[] | undefined,
		updatedItem: Partial<TData> & { id: string }
	) => TData[]
	removeOptimisticUpdate?: (
		oldData: TData[] | undefined,
		itemId: string
	) => TData[]
	successMessage?: string | ((data: TData) => string)
	errorMessage?: string
	invalidateQueries?: unknown[][]
	onErrorRecovery?: (
		error: unknown,
		variables: TVariables,
		context: MutationContext
	) => void
}

interface MutationContext {
	previousData?: unknown
}

export function useOptimisticMutation<
	TData extends { id: string },
	// Constrain TVariables so .type, .data, and .id are recognized by TS
	TVariables extends {
		type: 'create' | 'update' | 'delete'
		data?: Partial<TData>
		id?: string
	}
>(options: OptimisticMutationOptions<TData, TVariables>) {
	const queryClient = useQueryClient()

	const {
		mutationFn,
		queryKey,
		addOptimisticUpdate,
		updateOptimisticUpdate,
		removeOptimisticUpdate,
		successMessage,
		errorMessage = 'Operation failed',
		invalidateQueries = [],
		onErrorRecovery
	} = options

	return useMutation<TData, Error, TVariables, MutationContext>({
		mutationFn,

		onMutate: async variables => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey })

			// Snapshot previous value
			const previousData = queryClient.getQueryData<TData[]>(queryKey)

			// Optimistically update the cache
			if (addOptimisticUpdate && variables.type === 'create') {
				const optimisticItem = {
					id: `temp-${Date.now()}`,
					// ensure we're always spreading an object
					...(variables.data ?? {}),
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				} as unknown as Partial<TData>

				queryClient.setQueryData<TData[]>(queryKey, old =>
					addOptimisticUpdate(old, optimisticItem)
				)
			}

			if (
				updateOptimisticUpdate &&
				variables.type === 'update' &&
				variables.id
			) {
				const optimisticUpdate = {
					id: variables.id,
					// ensure we're always spreading an object
					...(variables.data ?? {}),
					updatedAt: new Date().toISOString()
				} as unknown as Partial<TData> & { id: string }

				queryClient.setQueryData<TData[]>(queryKey, old =>
					updateOptimisticUpdate(old, optimisticUpdate)
				)
			}

			if (
				removeOptimisticUpdate &&
				variables.type === 'delete' &&
				variables.id
			) {
				queryClient.setQueryData<TData[]>(queryKey, old =>
					removeOptimisticUpdate(old, variables.id!)
				)
			}

			return { previousData }
		},

		onError: (error, variables, context) => {
			// Revert optimistic update
			if (context?.previousData) {
				queryClient.setQueryData(queryKey, context.previousData)
			}

			logger.error('Optimistic mutation failed', error, {
				variables:
					process.env.NODE_ENV === 'development'
						? variables
						: '[hidden]',
				queryKey
			})

			toast.error(errorMessage)

			// Custom error recovery
			onErrorRecovery?.(error, variables, context!)
		},

		onSuccess: (data, variables) => {
			// If this was a create operation, replace temp ID with real ID
			if (variables.type === 'create' && variables.data) {
				queryClient.setQueryData<TData[]>(queryKey, old => {
					if (!old) return [data]
					return old.map(item =>
						item.id.startsWith('temp-') ? data : item
					)
				})
			}

			// Show success message
			if (successMessage) {
				const message =
					typeof successMessage === 'function'
						? successMessage(data)
						: successMessage
				toast.success(message)
			}

			// Invalidate additional queries
			invalidateQueries.forEach(key => {
				queryClient.invalidateQueries({ queryKey: key })
			})

			logger.debug('Optimistic mutation succeeded', {
				data:
					process.env.NODE_ENV === 'development' ? data : '[hidden]',
				queryKey
			})
		},

		onSettled: () => {
			// Always refetch the main query to ensure consistency
			queryClient.invalidateQueries({ queryKey })
		}
	})
}

/**
 * Generic optimistic list operations
 */
export function useOptimisticList<T extends { id: string }>(
	queryKey: readonly unknown[]
) {
	const queryClient = useQueryClient()

	const addOptimistic = useCallback(
		(item: Partial<T>) => {
			queryClient.setQueryData<T[]>(queryKey, old => {
				const optimisticItem = {
					id: `temp-${Date.now()}`,
					...item,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				} as unknown as T

				if (!old) return [optimisticItem]
				return [optimisticItem, ...old]
			})
		},
		[queryClient, queryKey]
	)

	const updateOptimistic = useCallback(
		(id: string, updates: Partial<T>) => {
			queryClient.setQueryData<T[]>(queryKey, old => {
				if (!old) return []
				return old.map(item =>
					item.id === id
						? {
								...item,
								...updates,
								updatedAt: new Date().toISOString()
							}
						: item
				)
			})
		},
		[queryClient, queryKey]
	)

	const removeOptimistic = useCallback(
		(id: string) => {
			queryClient.setQueryData<T[]>(queryKey, old => {
				if (!old) return []
				return old.filter(item => item.id !== id)
			})
		},
		[queryClient, queryKey]
	)

	const revertOptimistic = useCallback(() => {
		queryClient.invalidateQueries({ queryKey })
	}, [queryClient, queryKey])

	return {
		addOptimistic,
		updateOptimistic,
		removeOptimistic,
		revertOptimistic
	}
}

/**
 * Optimistic mutations with rollback capability
 */
export function useOptimisticWithRollback<T extends { id: string }>(
	queryKey: readonly unknown[]
) {
	const queryClient = useQueryClient()

	const createSnapshot = useCallback(() => {
		return queryClient.getQueryData<T[]>(queryKey)
	}, [queryClient, queryKey])

	const rollback = useCallback(
		(snapshot: T[] | undefined) => {
			if (snapshot) {
				queryClient.setQueryData(queryKey, snapshot)
			}
		},
		[queryClient, queryKey]
	)

	const commit = useCallback(() => {
		queryClient.invalidateQueries({ queryKey })
	}, [queryClient, queryKey])

	return {
		createSnapshot,
		rollback,
		commit
	}
}

export default useOptimisticMutation
