import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys, handleApiError } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import type {
	TenantWithDetails,
	CreateTenantDto,
	UpdateTenantDto,
	TenantQuery,
	InviteTenantData
} from '@/types/api'

// Tenants list hook
export function useTenants(query?: TenantQuery) {
	return useQuery({
		queryKey: queryKeys.tenants.list(query),
		queryFn: () => apiClient.tenants.getAll(query),
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: apiClient.auth.isAuthenticated()
	})
}

// Single tenant hook
export function useTenant(id: string) {
	return useQuery({
		queryKey: queryKeys.tenants.detail(id),
		queryFn: () => apiClient.tenants.getById(id),
		staleTime: 5 * 60 * 1000,
		enabled: !!id && apiClient.auth.isAuthenticated()
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
		enabled: apiClient.auth.isAuthenticated()
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
				// Create tenant invitation record in database
				const { data: invitation, error: inviteError } = await supabase
					.from('tenant_invitations')
					.insert({
						name: inviteData.name,
						email: inviteData.email,
						phone: inviteData.phone,
						property_id: inviteData.propertyId,
						unit_id: inviteData.unitId,
						status: 'pending',
						invited_at: new Date().toISOString(),
						expires_at: new Date(
							Date.now() + 7 * 24 * 60 * 60 * 1000
						).toISOString(), // 7 days
						invitation_token: crypto.randomUUID()
					})
					.select()
					.single()

				if (inviteError) throw inviteError

				// Send invitation email
				const { error: emailError } = await supabase.functions.invoke(
					'send-tenant-invitation',
					{
						body: {
							invitationId: invitation.id,
							tenantName: inviteData.name,
							tenantEmail: inviteData.email,
							propertyId: inviteData.propertyId,
							unitId: inviteData.unitId,
							invitationToken: invitation.invitation_token,
							expiresAt: invitation.expires_at
						}
					}
				)

				if (emailError) {
					logger.warn('Failed to send invitation email', emailError)
					// Don't fail the mutation, just log the email error
				}

				logger.info('Tenant invitation sent successfully', undefined, {
					invitationId: invitation.id,
					tenantEmail: inviteData.email
				})

				return invitation
			} catch (error) {
				logger.error('Failed to invite tenant', error)
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
				// Get existing invitation
				const { data: invitation, error: fetchError } = await supabase
					.from('tenant_invitations')
					.select('*')
					.eq('id', invitationId)
					.single()

				if (fetchError) throw fetchError

				// Update expiration date and create new token
				const newToken = crypto.randomUUID()
				const newExpiresAt = new Date(
					Date.now() + 7 * 24 * 60 * 60 * 1000
				).toISOString()

				const { error: updateError } = await supabase
					.from('tenant_invitations')
					.update({
						invitation_token: newToken,
						expires_at: newExpiresAt,
						resent_at: new Date().toISOString()
					})
					.eq('id', invitationId)

				if (updateError) throw updateError

				// Resend invitation email
				const { error: emailError } = await supabase.functions.invoke(
					'send-tenant-invitation',
					{
						body: {
							invitationId: invitation.id,
							tenantName: invitation.name,
							tenantEmail: invitation.email,
							propertyId: invitation.property_id,
							unitId: invitation.unit_id,
							invitationToken: newToken,
							expiresAt: newExpiresAt,
							isResend: true
						}
					}
				)

				if (emailError) {
					logger.warn('Failed to resend invitation email', emailError)
				}

				logger.info(
					'Tenant invitation resent successfully',
					undefined,
					{
						invitationId,
						tenantEmail: invitation.email
					}
				)

				return { invitationId, newToken, newExpiresAt }
			} catch (error) {
				logger.error('Failed to resend invitation', error)
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
				// Delete invitation from database
				const { error } = await supabase
					.from('tenant_invitations')
					.delete()
					.eq('id', invitationId)

				if (error) throw error

				logger.info(
					'Tenant invitation deleted successfully',
					undefined,
					{
						invitationId
					}
				)

				return invitationId
			} catch (error) {
				logger.error('Failed to delete pending invitation', error)
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
				const { data, error } = await supabase
					.from('tenant_invitations')
					.select(
						`
						*,
						property:properties(name, address),
						unit:units(unitNumber)
					`
					)
					.eq('status', 'pending')
					.order('invited_at', { ascending: false })

				if (error) throw error

				return data || []
			} catch (error) {
				logger.error('Failed to fetch pending invitations', error)
				return []
			}
		},
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}
