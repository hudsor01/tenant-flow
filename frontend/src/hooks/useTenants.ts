import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { queryKeys, handleApiError } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import type {
	TenantWithDetails,
	CreateTenantDto,
	UpdateTenantDto,
	InviteTenantData
} from '@/types/api'
import type { TenantQuery } from '@/types/query-types'

// Tenants list hook
export function useTenants(query?: TenantQuery) {
	return useQuery({
		queryKey: queryKeys.tenants.list(query),
		queryFn: () => apiClient.tenants.getAll(query),
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: true
	})
}

// Single tenant hook
export function useTenant(id: string) {
	return useQuery({
		queryKey: queryKeys.tenants.detail(id),
		queryFn: () => apiClient.tenants.getById(id),
		staleTime: 5 * 60 * 1000,
		enabled: !!id
	})
}

// Create tenant mutation
export function useCreateTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreateTenantDto) => apiClient.tenants.create(data),
		onSuccess: (newTenant: TenantWithDetails) => {
			// Invalidate and refetch tenants list
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.stats()
			})

			// Add the new tenant to cache
			queryClient.setQueryData(
				queryKeys.tenants.detail(newTenant.id),
				newTenant
			)

			toast.success('Tenant created successfully')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Update tenant mutation
export function useUpdateTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateTenantDto }) =>
			apiClient.tenants.update(id, data),
		onSuccess: (updatedTenant: TenantWithDetails) => {
			// Update the tenant in cache
			queryClient.setQueryData(
				queryKeys.tenants.detail(updatedTenant.id),
				updatedTenant
			)

			// Invalidate lists to ensure consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.stats()
			})

			toast.success('Tenant updated successfully')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Delete tenant mutation
export function useDeleteTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => apiClient.tenants.delete(id),
		onSuccess: (_, deletedId) => {
			// Remove tenant from cache
			queryClient.removeQueries({
				queryKey: queryKeys.tenants.detail(deletedId)
			})

			// Invalidate lists
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.stats()
			})

			// Also invalidate related data
			queryClient.invalidateQueries({
				queryKey: queryKeys.leases.lists()
			})
			queryClient.invalidateQueries({
				queryKey: queryKeys.payments.lists()
			})

			toast.success('Tenant deleted successfully')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Tenant statistics hook
export function useTenantStats() {
	return useQuery({
		queryKey: queryKeys.tenants.stats(),
		queryFn: () => apiClient.tenants.getStats(),
		staleTime: 2 * 60 * 1000, // 2 minutes
		enabled: true
	})
}

// Upload tenant document mutation
export function useUploadTenantDocument() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			id,
			file,
			documentType
		}: {
			id: string
			file: File
			documentType: string
		}) => apiClient.tenants.uploadDocument(id, file, documentType),
		onSuccess: (_, { id }) => {
			// Invalidate tenant to refetch with new document
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.detail(id)
			})
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})

			toast.success('Document uploaded successfully')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Combined hook for tenant management
export function useTenantActions() {
	const createTenant = useCreateTenant()
	const updateTenant = useUpdateTenant()
	const deleteTenant = useDeleteTenant()
	const uploadDocument = useUploadTenantDocument()

	return {
		create: createTenant,
		update: updateTenant,
		delete: deleteTenant,
		uploadDocument,
		isLoading:
			createTenant.isPending ||
			updateTenant.isPending ||
			deleteTenant.isPending ||
			uploadDocument.isPending
	}
}

// Tenant invitation system implementation
export function useInviteTenant() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (inviteData: InviteTenantData) => {
			try {
				// Create tenant invitation using API client
				const invitation = await apiClient.tenants.invite(inviteData)

				logger.info('Tenant invitation sent successfully', undefined, {
					invitationId: invitation.tenantId,
					tenantEmail: inviteData.email
				})

				return invitation
			} catch (error) {
				logger.error('Failed to invite tenant', error instanceof Error ? error : new Error(String(error)))
				throw error
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			queryClient.invalidateQueries({
				queryKey: ['tenant-invitations']
			})
			toast.success('Tenant invitation sent successfully')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

export function useResendInvitation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (invitationId: string) => {
			try {
				// Resend invitation using API client
				const result = await apiClient.tenants.resendInvitation(invitationId)

				logger.info(
					'Tenant invitation resent successfully',
					undefined,
					{
						invitationId
					}
				)

				return result
			} catch (error) {
				logger.error('Failed to resend invitation', error instanceof Error ? error : new Error(String(error)))
				throw error
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['tenant-invitations']
			})
			toast.success('Invitation resent successfully')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

export function useDeletePendingInvitation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (invitationId: string) => {
			try {
				// Delete invitation using API client
				await apiClient.tenants.deleteInvitation(invitationId)

				logger.info(
					'Tenant invitation deleted successfully',
					undefined,
					{
						invitationId
					}
				)

				return invitationId
			} catch (error) {
				logger.error('Failed to delete pending invitation', error instanceof Error ? error : new Error(String(error)))
				throw error
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.tenants.lists()
			})
			queryClient.invalidateQueries({
				queryKey: ['tenant-invitations']
			})
			toast.success('Invitation deleted successfully')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Hook to get pending invitations
export function usePendingInvitations() {
	return useQuery({
		queryKey: ['tenant-invitations'],
		queryFn: async () => {
			try {
				const invitations = await apiClient.tenants.getPendingInvitations()
				return invitations || []
			} catch (error) {
				logger.error('Failed to fetch pending invitations', error instanceof Error ? error : new Error(String(error)))
				return []
			}
		},
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}
