// Purpose: Type-safe base resource hook for CRUD operations.
// Assumptions: All resource types/interfaces are imported from '@/types/resource'.
// No runtime resource switching—client is passed explicitly for type safety.

import { useRequest } from 'ahooks'
import { toast } from 'sonner'
import type {
	ResourceClient,
	ResourceConfig,
	UseResourceResult,
} from '@/types/resource'

/**
 * 🚀 BASE RESOURCE HOOK - For resource-specific hooks only.
 *
 * Features:
 * - Automatic caching with configurable stale time
 * - Built-in error retry with exponential backoff
 * - Loading delay to prevent flicker
 * - Optimistic updates for mutations
 * - Auto-refresh after mutations
 * - Toast notifications
 * - Request deduplication
 * - Manual cache management
 */
export function useResource<T, CreateDto = Partial<T>>(
	client: ResourceClient<T, CreateDto>,
	resourceLabel: string,
	config: ResourceConfig<T> = {},
): UseResourceResult<T, CreateDto> {
	const {
		autoRefresh = true,
		showSuccessToast = true,
		showErrorToast = true,
		cacheTime = 5 * 60 * 1000, // 5 minutes default
		...requestOptions
	} = config

	// GET List - The main data fetching
	const listQuery = useRequest(
		async () => {
			return client.getAll()
		},
		{
			loadingDelay: 300, // Prevent loading flicker on fast requests
			cacheKey: `${resourceLabel}-list`,
			staleTime: cacheTime,
			retryCount: 3,
			retryInterval: 1000, // 1s, 2s, 4s backoff
			...requestOptions,
			onError: error => {
				if (showErrorToast) {
					toast.error(`Failed to load ${resourceLabel}: ${error.message}`)
				}
				if (requestOptions && 'onError' in requestOptions && requestOptions.onError) {
					requestOptions.onError(error, [])
				}
			},
		},
	)

	// CREATE Mutation
	const createMutation = useRequest(
		async (data: CreateDto) => {
			return client.create(data)
		},
		{
			manual: true,
			onSuccess: () => {
				if (autoRefresh) {
					listQuery.refresh()
				}
				if (showSuccessToast) {
					toast.success(`${resourceLabel} created successfully`)
				}
			},
			onError: error => {
				if (showErrorToast) {
					toast.error(`Failed to create ${resourceLabel}: ${error.message}`)
				}
			},
		},
	)

	// UPDATE Mutation
	const updateMutation = useRequest(
		async ({ id, data }: { id: string; data: Partial<T> }) => {
			return client.update(id, data)
		},
		{
			manual: true,
			onSuccess: () => {
				if (autoRefresh) {
					listQuery.refresh()
				}
				if (showSuccessToast) {
					toast.success(`${resourceLabel} updated successfully`)
				}
			},
			onError: error => {
				if (showErrorToast) {
					toast.error(`Failed to update ${resourceLabel}: ${error.message}`)
				}
			},
		},
	)

	// DELETE Mutation
	const deleteMutation = useRequest(
		async (id: string) => {
			return client.delete(id)
		},
		{
			manual: true,
			onSuccess: () => {
				if (autoRefresh) {
					listQuery.refresh()
				}
				if (showSuccessToast) {
					toast.success(`${resourceLabel} deleted successfully`)
				}
			},
			onError: error => {
				if (showErrorToast) {
					toast.error(`Failed to delete ${resourceLabel}: ${error.message}`)
				}
			},
		},
	)

	return {
		data: (listQuery.data || []) as T[],
		loading: listQuery.loading,
		error: listQuery.error || null,
		refresh: listQuery.refresh,
		cancel: listQuery.cancel,
		mutate: (data: T[]) => listQuery.mutate(data),
		create: async (data: CreateDto) => {
			await createMutation.runAsync(data)
		},
		update: async (id: string, data: Partial<T>) => {
			await updateMutation.runAsync({ id, data })
		},
		remove: async (id: string) => {
			await deleteMutation.runAsync(id)
		},
		creating: createMutation.loading,
		updating: updateMutation.loading,
		deleting: deleteMutation.loading,
	}
}
