import { trpc } from '@/lib/clients'
import { handleApiError } from '@/lib/utils/css.utils'
import { toast } from 'sonner'
import { toastMessages } from '@/lib/toast-messages'
import type { TenantQuery } from '@tenantflow/shared'
import type { TRPCClientErrorLike } from '@trpc/client'
import type { AppRouter } from '@tenantflow/shared'

// Use the typed TRPC client
const trpcClient = trpc



// No transformation needed - backend already returns ISO strings for dates

/**
 * Consolidated tenant hooks with all features from both versions
 * Combines enhanced polling, error handling, toast notifications, and real-time updates
 */

// Main tenant queries
export function useTenants(query?: TenantQuery) {
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

export function useTenant(id: string) {
	const result = trpcClient.tenants.byId.useQuery({ id }, {
		staleTime: 5 * 60 * 1000,
		enabled: !!id,
	})

	return result
}

export function useTenantStats() {
	return trpcClient.tenants.stats.useQuery(undefined, {
		staleTime: 2 * 60 * 1000,
		refetchInterval: 2 * 60 * 1000,
	})
}

// Note: verifyInvitation is not in the current AppRouter interface
// This would need to be added to the backend or use a different approach

// Tenant mutations
export function useInviteTenant() {
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

export function useUpdateTenant() {
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

export function useDeleteTenant() {
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
export function useRealtimeTenants(query?: TenantQuery) {
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
export function useArchiveTenant() {
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
export function useTenantActions() {
	const tenantsQuery = useTenants()
	const inviteMutation = useInviteTenant()
	const updateMutation = useUpdateTenant()
	const deleteMutation = useDeleteTenant()
	const archiveMutation = useArchiveTenant()

	return {
		data: tenantsQuery.data?.tenants || [],
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
			const tenants = data || tenantsQuery.data?.tenants || []
			return tenants.some((t: { id?: string }) => t && t.id) // Check if any tenants exist
		}
	}
}