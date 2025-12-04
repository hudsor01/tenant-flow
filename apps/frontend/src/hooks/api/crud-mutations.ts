/**
 * Generic CRUD Mutations Factory
 * Consolidates common CRUD mutation patterns across entities.
 * Uses native fetch for NestJS calls.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'

export interface CrudMutationsConfig<TCreateInput, TUpdateInput, TEntity> {
	entityName: string
	createEndpoint: string
	updateEndpoint: (id: string) => string
	deleteEndpoint: (id: string) => string
	listQueryKey: () => readonly unknown[]
	detailQueryKey: (id: string) => readonly unknown[]
	createInput: TCreateInput
	updateInput: TUpdateInput
	entity: TEntity
}


export function createCrudMutations<
	TCreateInput,
	TUpdateInput,
	TEntity
>({
	entityName,
	createEndpoint,
	updateEndpoint,
	deleteEndpoint,
	listQueryKey,
	detailQueryKey
}: Omit<CrudMutationsConfig<TCreateInput, TUpdateInput, TEntity>, 'createInput' | 'updateInput' | 'entity'>) {
	/**
	 * Create entity mutation
	 */
	function useCreateMutation() {
		const queryClient = useQueryClient()

		return useMutation({
			mutationFn: (data: TCreateInput) =>
				apiRequest<TEntity>(createEndpoint, {
					method: 'POST',
					body: JSON.stringify(data)
				}),
			onSuccess: (_newEntity) => {
				queryClient.invalidateQueries({ queryKey: listQueryKey() })
				toast.success(`${entityName} created successfully`)
			},
			onError: (error) => {
				handleMutationError(error, `Create ${entityName.toLowerCase()}`)
			}
		})
	}

	/**
	 * Update entity mutation
	 */
	function useUpdateMutation() {
		const queryClient = useQueryClient()

		return useMutation({
			mutationFn: ({ id, data }: { id: string; data: TUpdateInput }) =>
				apiRequest<TEntity>(updateEndpoint(id), {
					method: 'PUT',
					body: JSON.stringify(data)
				}),
			onSuccess: (updatedEntity, { id }) => {
				queryClient.setQueryData(detailQueryKey(id), updatedEntity)
				queryClient.invalidateQueries({ queryKey: listQueryKey() })
				toast.success(`${entityName} updated successfully`)
			},
			onError: (error) => {
				handleMutationError(error, `Update ${entityName.toLowerCase()}`)
			}
		})
	}

	/**
	 * Delete entity mutation
	 */
	function useDeleteMutation() {
		const queryClient = useQueryClient()

		return useMutation({
			mutationFn: (id: string) =>
				apiRequest(deleteEndpoint(id), {
					method: 'DELETE'
				}),
			onSuccess: (_result, deletedId) => {
				queryClient.removeQueries({ queryKey: detailQueryKey(deletedId) })
				queryClient.invalidateQueries({ queryKey: listQueryKey() })
				toast.success(`${entityName} deleted successfully`)
			},
			onError: (error) => {
				handleMutationError(error, `Delete ${entityName.toLowerCase()}`)
			}
		})
	}

	return {
		useCreateMutation,
		useUpdateMutation,
		useDeleteMutation
	}
}
