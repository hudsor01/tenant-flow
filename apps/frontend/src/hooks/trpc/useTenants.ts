import { trpc } from '@/lib/clients'
import { handleApiError } from '@/lib/utils/css.utils'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import type { TenantQuery } from '@tenantflow/shared'
import type { TRPCClientErrorLike } from '@trpc/client'
import type { AppRouter } from '@tenantflow/backend/trpc'

// Use the typed TRPC client
const trpcClient: typeof trpc = trpc



// No transformation needed - backend already returns ISO strings for dates

/**
 * Consolidated tenant hooks with all features from both versions
 * Combines enhanced polling, error handling, toast notifications, and real-time updates
 */

// Main tenant queries
export function useTenants(query?: TenantQuery): ReturnType<typeof trpcClient.tenants.list.useQuery> {
	const result = trpcClient.tenants.list.useQuery(query ? {
		...query,
		limit: query.limit?.toString(),
		offset: query.offset?.toString()
	} : {}, {
		staleTime: 5 * 60 * 1000,
		refetchInterval: 60000,
	})

	return result
}

<<<<<<< HEAD
export function useTenant(id: string): ReturnType<typeof trpcClient.tenants.byId.useQuery> {
=======
export function useTenant(id: string) {
>>>>>>> origin/main
	const result = trpcClient.tenants.byId.useQuery({ id }, {
		staleTime: 5 * 60 * 1000,
		enabled: !!id,
	})

	return result
}

<<<<<<< HEAD
export function useTenantStats(): ReturnType<typeof trpcClient.tenants.stats.useQuery> {
=======
export function useTenantStats() {
>>>>>>> origin/main
	return trpcClient.tenants.stats.useQuery(undefined, {
		staleTime: 2 * 60 * 1000,
		refetchInterval: 2 * 60 * 1000,
	})
}

// Note: verifyInvitation is not in the current AppRouter interface
// This would need to be added to the backend or use a different approach

// Tenant mutations
<<<<<<< HEAD
export function useInviteTenant(): ReturnType<typeof trpcClient.tenants.add.useMutation> {
=======
export function useInviteTenant() {
>>>>>>> origin/main
	const utils = trpcClient.useUtils()
	
	return trpcClient.tenants.add.useMutation({
		onSuccess: () => {
			utils.tenants.list.invalidate()
			toast.success(toastMessages.success.created('tenant'))
		},
		onError: (error: TRPCClientErrorLike<AppRouter>) => {
			toast.error(handleApiError(error))
		}
	})
}

// Alias for backward compatibility
export const useCreateTenant = useInviteTenant

<<<<<<< HEAD
export function useUpdateTenant(): ReturnType<typeof trpcClient.tenants.update.useMutation> {
=======
export function useUpdateTenant() {
>>>>>>> origin/main
	const utils = trpcClient.useUtils()
	
	return trpcClient.tenants.update.useMutation({
		onSuccess: () => {
			utils.tenants.list.invalidate()
			toast.success(toastMessages.success.updated('tenant'))
		},
		onError: (error: TRPCClientErrorLike<AppRouter>) => {
			toast.error(handleApiError(error))
		}
	})
}

<<<<<<< HEAD
export function useDeleteTenant(): ReturnType<typeof trpcClient.tenants.delete.useMutation> {
=======
export function useDeleteTenant() {
>>>>>>> origin/main
	const utils = trpcClient.useUtils()
	
	return trpcClient.tenants.delete.useMutation({
		onSuccess: () => {
			utils.tenants.list.invalidate()
			toast.success(toastMessages.success.deleted('tenant'))
		},
		onError: (error: TRPCClientErrorLike<AppRouter>) => {
			toast.error(handleApiError(error))
		}
	})
}

// Note: These invitation management functions are not in the current AppRouter interface
// They would need to be added to the backend or implemented differently

// Real-time tenant updates
<<<<<<< HEAD
export function useRealtimeTenants(query?: TenantQuery): ReturnType<typeof trpcClient.tenants.list.useQuery> {
=======
export function useRealtimeTenants(query?: TenantQuery) {
>>>>>>> origin/main
	const result = trpcClient.tenants.list.useQuery(
		query ? {
			...query,
			limit: query.limit?.toString(),
			offset: query.offset?.toString()
		} : {},
		{
			refetchInterval: 30000,
			refetchIntervalInBackground: false,
			staleTime: 30 * 1000,
		}
	)

	return result
}

// Archive tenant mutation (using delete for now)
<<<<<<< HEAD
export function useArchiveTenant(): ReturnType<typeof trpcClient.tenants.delete.useMutation> {
=======
export function useArchiveTenant() {
>>>>>>> origin/main
	const utils = trpcClient.useUtils()
	
	return trpcClient.tenants.delete.useMutation({
		onSuccess: () => {
			utils.tenants.list.invalidate()
			toast.success(toastMessages.success.updated('tenant'))
		},
		onError: (error: TRPCClientErrorLike<AppRouter>) => {
			toast.error(handleApiError(error))
		}
	})
}

// Combined tenant actions
export function useTenantActions(): {
	data: Array<{ id?: string }>;
	loading: boolean;
	error: unknown;
	refresh: () => void;
	invite: (variables: any) => void;
	update: (variables: any) => void;
	remove: (variables: any) => void;
	archive: (variables: any) => void;
	inviting: boolean;
	updating: boolean;
	deleting: boolean;
	archiving: boolean;
	anyLoading: boolean;
	hasActive: (data?: Array<{ id?: string }>) => boolean;
} {
	const tenantsQuery = useTenants()
	const inviteMutation = useInviteTenant()
	const updateMutation = useUpdateTenant()
	const deleteMutation = useDeleteTenant()
	const archiveMutation = useArchiveTenant()

	return {
		data: (tenantsQuery.data as { tenants?: Array<{ id?: string }> })?.tenants || [],
		loading: tenantsQuery.isLoading,
		error: tenantsQuery.error,
		refresh: tenantsQuery.refetch,

		invite: inviteMutation.mutate,
		update: updateMutation.mutate,
		remove: deleteMutation.mutate,
		archive: archiveMutation.mutate,

		inviting: inviteMutation.isPending,
		updating: updateMutation.isPending,
		deleting: deleteMutation.isPending,
		archiving: archiveMutation.isPending,

		anyLoading:
			tenantsQuery.isLoading ||
			inviteMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending ||
			archiveMutation.isPending,

		hasActive: (data?: Array<{ id?: string }>) => {
<<<<<<< HEAD
			const tenants = data || (tenantsQuery.data as { tenants?: Array<{ id?: string }> })?.tenants || []
=======
			const tenants = data || tenantsQuery.data?.tenants || []
>>>>>>> origin/main
			return tenants.some((t: { id?: string }) => t && t.id) // Check if any tenants exist
		}
	}
}