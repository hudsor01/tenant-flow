/**
 * Emergency Contact Hooks
 *
 * TanStack Query hooks for managing tenant emergency contacts.
 * Supports CRUD operations with optimistic updates.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { toast } from 'sonner'
import { logger } from '@repo/shared/lib/frontend-logger'

// ========================================
// Types
// ========================================

export interface EmergencyContact {
	id: string
	tenantId: string
	contactName: string
	relationship: string
	phoneNumber: string
	email: string | null
	createdAt: string
	updatedAt: string
}

export interface CreateEmergencyContactInput {
	tenantId: string
	contactName: string
	relationship: string
	phoneNumber: string
	email?: string | null
}

export interface UpdateEmergencyContactInput {
	contactName?: string
	relationship?: string
	phoneNumber?: string
	email?: string | null
}

// ========================================
// Query Keys
// ========================================

export const emergencyContactKeys = {
	all: ['emergency-contacts'] as const,
	tenant: (tenantId: string) =>
		[...emergencyContactKeys.all, tenantId] as const
}

// ========================================
// Query Hooks
// ========================================

/**
 * Fetch emergency contact for a tenant
 * Returns null if no emergency contact exists
 */
export function useEmergencyContact(tenantId: string) {
	return useQuery({
		queryKey: emergencyContactKeys.tenant(tenantId),
		queryFn: () =>
			clientFetch<EmergencyContact | null>(
				`/api/v1/tenants/${tenantId}/emergency-contact`
			),
		enabled: !!tenantId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2
	})
}

// ========================================
// Mutation Hooks
// ========================================

/**
 * Create emergency contact for a tenant
 */
export function useCreateEmergencyContact(tenantId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: Omit<CreateEmergencyContactInput, 'tenantId'>) =>
			clientFetch<EmergencyContact>(
				`/api/v1/tenants/${tenantId}/emergency-contact`,
				{
					method: 'POST',
					body: JSON.stringify({ ...input, tenantId })
				}
			),

		onMutate: async newContact => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: emergencyContactKeys.tenant(tenantId)
			})

			// Snapshot previous value
			const previousContact = queryClient.getQueryData<EmergencyContact | null>(
				emergencyContactKeys.tenant(tenantId)
			)

			// Optimistically update with temporary ID
			queryClient.setQueryData(emergencyContactKeys.tenant(tenantId), {
				id: 'temp-id',
				tenantId,
				...newContact,
				email: newContact.email || null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})

			return { previousContact }
		},

		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousContact !== undefined) {
				queryClient.setQueryData(
					emergencyContactKeys.tenant(tenantId),
					context.previousContact
				)
			}

			logger.error('Failed to create emergency contact', {
				action: 'create_emergency_contact',
				metadata: { error: err }
			})
			toast.error('Failed to save emergency contact')
		},

		onSuccess: () => {
			toast.success('Emergency contact saved successfully')
		},

		onSettled: () => {
			// Refetch to get real server data
			queryClient.invalidateQueries({
				queryKey: emergencyContactKeys.tenant(tenantId)
			})
		}
	})
}

/**
 * Update emergency contact for a tenant
 */
export function useUpdateEmergencyContact(tenantId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: UpdateEmergencyContactInput) =>
			clientFetch<EmergencyContact>(
				`/api/v1/tenants/${tenantId}/emergency-contact`,
				{
					method: 'PUT',
					body: JSON.stringify(input)
				}
			),

		onMutate: async newData => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: emergencyContactKeys.tenant(tenantId)
			})

			// Snapshot previous value
			const previousContact = queryClient.getQueryData<EmergencyContact | null>(
				emergencyContactKeys.tenant(tenantId)
			)

			// Optimistically update (merge with existing data)
			if (previousContact) {
				queryClient.setQueryData(emergencyContactKeys.tenant(tenantId), {
					...previousContact,
					...newData,
					updatedAt: new Date().toISOString()
				})
			}

			return { previousContact }
		},

		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousContact !== undefined) {
				queryClient.setQueryData(
					emergencyContactKeys.tenant(tenantId),
					context.previousContact
				)
			}

			logger.error('Failed to update emergency contact', {
				action: 'update_emergency_contact',
				metadata: { error: err }
			})
			toast.error('Failed to update emergency contact')
		},

		onSuccess: () => {
			toast.success('Emergency contact updated successfully')
		},

		onSettled: () => {
			// Refetch to get real server data
			queryClient.invalidateQueries({
				queryKey: emergencyContactKeys.tenant(tenantId)
			})
		}
	})
}

/**
 * Delete emergency contact for a tenant
 */
export function useDeleteEmergencyContact(tenantId: string) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () =>
			clientFetch<{ success: boolean; message: string }>(
				`/api/v1/tenants/${tenantId}/emergency-contact`,
				{
					method: 'DELETE'
				}
			),

		onMutate: async () => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: emergencyContactKeys.tenant(tenantId)
			})

			// Snapshot previous value
			const previousContact = queryClient.getQueryData<EmergencyContact | null>(
				emergencyContactKeys.tenant(tenantId)
			)

			// Optimistically set to null
			queryClient.setQueryData(emergencyContactKeys.tenant(tenantId), null)

			return { previousContact }
		},

		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousContact !== undefined) {
				queryClient.setQueryData(
					emergencyContactKeys.tenant(tenantId),
					context.previousContact
				)
			}

			logger.error('Failed to delete emergency contact', {
				action: 'delete_emergency_contact',
				metadata: { error: err }
			})
			toast.error('Failed to delete emergency contact')
		},

		onSuccess: () => {
			toast.success('Emergency contact removed successfully')
		},

		onSettled: () => {
			// Refetch to confirm deletion
			queryClient.invalidateQueries({
				queryKey: emergencyContactKeys.tenant(tenantId)
			})
		}
	})
}
