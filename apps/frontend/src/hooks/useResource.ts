// Purpose: Type-safe base resource hook for CRUD operations using TanStack React Query.
// Assumptions: All resource types/interfaces are imported from '@/types/resource'.
// No runtime resource switching—client is passed explicitly for type safety.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
	ResourceClient,
	ResourceConfig,
	UseResourceResult,
} from "@/types/resource"

export function useResource<T, CreateDto = Partial<T>>(
	client: ResourceClient<T, CreateDto>,
	resourceLabel: string,
	config: ResourceConfig<T> = {},
): UseResourceResult<T, CreateDto> {
	const {
		autoRefresh = true,
		showSuccessToast = true,
		showErrorToast = true,
		cacheTime = 5 * 60 * 1000,
		...queryOptions
	} = config

	const queryClient = useQueryClient()

	// GET List
	const query = useQuery<T[], Error>({
		queryKey: [resourceLabel, "list"],
		queryFn: async () => {
			if (typeof client.getAll === "function") {
				return client.getAll()
			}
			throw new Error("Resource client does not implement getAll")
		},
		staleTime: cacheTime,
		...queryOptions,
	})

	// CREATE Mutation
	const createMutation = useMutation({
		mutationFn: (data: CreateDto) => client.create(data),
		onSuccess: () => {
			if (autoRefresh) {
				queryClient.invalidateQueries({ queryKey: [resourceLabel, "list"] })
			}
			if (showSuccessToast) {
				toast.success(`${resourceLabel} created successfully`)
			}
		},
		onError: (err: Error) => {
			if (showErrorToast) {
				toast.error(`Failed to create ${resourceLabel}: ${err.message}`)
			}
		},
	})

	// UPDATE Mutation
	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
			client.update(id, data),
		onSuccess: () => {
			if (autoRefresh) {
				queryClient.invalidateQueries({ queryKey: [resourceLabel, "list"] })
			}
			if (showSuccessToast) {
				toast.success(`${resourceLabel} updated successfully`)
			}
		},
		onError: (err: Error) => {
			if (showErrorToast) {
				toast.error(`Failed to update ${resourceLabel}: ${err.message}`)
			}
		},
	})

	// DELETE Mutation
	const deleteMutation = useMutation({
		mutationFn: (id: string) => client.delete(id),
		onSuccess: () => {
			if (autoRefresh) {
				queryClient.invalidateQueries({ queryKey: [resourceLabel, "list"] })
			}
			if (showSuccessToast) {
				toast.success(`${resourceLabel} deleted successfully`)
			}
		},
		onError: (err: Error) => {
			if (showErrorToast) {
				toast.error(`Failed to delete ${resourceLabel}: ${err.message}`)
			}
		},
	})

	// Provide a no-op cancel function to satisfy the type
	const cancel = () => { /* no-op for compatibility */ }

	return {
		data: Array.isArray(query.data) ? query.data : [],
		loading: query.isLoading,
		error: query.error ?? null,
		refresh: query.refetch,
		cancel,
		mutate: (newData: T[]) => {
			queryClient.setQueryData<T[]>([resourceLabel, "list"], newData)
		},
		create: async (data: CreateDto) => {
			await createMutation.mutateAsync(data)
		},
		update: async (id: string, data: Partial<T>) => {
			await updateMutation.mutateAsync({ id, data })
		},
		remove: async (id: string) => {
			await deleteMutation.mutateAsync(id)
		},
		creating: createMutation.isPending,
		updating: updateMutation.isPending,
		deleting: deleteMutation.isPending,
	}
}
