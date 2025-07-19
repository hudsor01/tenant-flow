import { trpc } from '@/lib/api'
import { handleApiError } from '@/lib/utils'
import { toast } from 'sonner'
import type { TenantQuery } from '@/types/query-types'

// No transformation needed - backend already returns ISO strings for dates

/**
 * Consolidated tenant hooks with all features from both versions
 * Combines enhanced polling, error handling, toast notifications, and real-time updates
 */

// Main tenant queries
export function useTenants(query?: TenantQuery) {
	const result = trpc.tenants.list.useQuery(query ? {
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
	const result = trpc.tenants.byId.useQuery({ id }, {
		staleTime: 5 * 60 * 1000,
		enabled: !!id,
	})

	return result
}

export function useTenantStats() {
	return trpc.tenants.stats.useQuery(undefined, {
		staleTime: 2 * 60 * 1000,
		refetchInterval: 2 * 60 * 1000,
	})
}

// Note: verifyInvitation is not in the current AppRouter interface
// This would need to be added to the backend or use a different approach

// Tenant mutations
export function useInviteTenant() {
	const utils = trpc.useUtils()
	
	return trpc.tenants.invite.useMutation({
		onSuccess: () => {
			utils.tenants.list.invalidate()
			toast.success('Tenant invitation sent successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

// Alias for backward compatibility
export const useCreateTenant = useInviteTenant

export function useUpdateTenant() {
	const utils = trpc.useUtils()
	
	return trpc.tenants.update.useMutation({
		onSuccess: (updatedTenant) => {
			utils.tenants.byId.setData({ id: updatedTenant.id }, updatedTenant)
			utils.tenants.list.invalidate()
			toast.success('Tenant updated successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useDeleteTenant() {
	const utils = trpc.useUtils()
	
	return trpc.tenants.delete.useMutation({
		onSuccess: () => {
			utils.tenants.list.invalidate()
			toast.success('Tenant removed successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

// Note: These invitation management functions are not in the current AppRouter interface
// They would need to be added to the backend or implemented differently

// Real-time tenant updates
export function useRealtimeTenants(query?: TenantQuery) {
	const result = trpc.tenants.list.useQuery(
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
	const utils = trpc.useUtils()
	
	return trpc.tenants.delete.useMutation({
		onSuccess: () => {
			utils.tenants.list.invalidate()
			toast.success('Tenant archived successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
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

		hasActive: (data?: { invitationStatus?: string }[]) => {
			const tenants = data || tenantsQuery.data?.tenants || []
			return tenants.some(t => t && t.invitationStatus === 'ACCEPTED')
		}
	}
}