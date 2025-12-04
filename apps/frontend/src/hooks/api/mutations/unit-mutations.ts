/**
 * Unit Mutation Options (TanStack Query v5 Pattern)
 *
 * Modern mutation patterns with proper error handling and cache invalidation.
 * Uses native fetch for NestJS calls.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import type { CreateUnitInput, UpdateUnitInput } from '@repo/shared/types/api-contracts'
import type { Unit } from '@repo/shared/types/core'
import { unitQueries } from '../queries/unit-queries'
import { propertyQueries } from '../queries/property-queries'
import { leaseQueries } from '../queries/lease-queries'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'


/**
 * Create unit mutation
 */
export function useCreateUnitMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateUnitInput) =>
			apiRequest<Unit>('/api/v1/units', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: (_newUnit) => {
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			toast.success('Unit created successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Create unit')
		}
	})
}

/**
 * Update unit mutation
 */
export function useUpdateUnitMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data, version }: { id: string; data: UpdateUnitInput; version?: number }) =>
			apiRequest<Unit>(`/api/v1/units/${id}`, {
				method: 'PUT',
				body: JSON.stringify(version ? { ...data, version } : data)
			}),
		onSuccess: (updatedUnit) => {
			queryClient.setQueryData(
				unitQueries.detail(updatedUnit.id).queryKey,
				updatedUnit
			)
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			toast.success('Unit updated successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Update unit')
		}
	})
}

/**
 * Delete unit mutation
 */
export function useDeleteUnitMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) =>
			apiRequest(`/api/v1/units/${id}`, {
				method: 'DELETE'
			}),
		onSuccess: (_result, deletedId) => {
			queryClient.removeQueries({ queryKey: unitQueries.detail(deletedId).queryKey })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			toast.success('Unit deleted successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Delete unit')
		}
	})
}
