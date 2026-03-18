/**
 * Tenant Invitation Mutation Hooks
 * TanStack Query mutation hooks for tenant invitations and notification preferences.
 *
 * Split from use-tenant-mutations.ts for the 300-line file size rule.
 *
 * mutationFn logic lives in tenantInviteMutations factories (query-keys/tenant-invite-mutation-options.ts).
 * This file spreads factories and adds onSuccess/onError/onSettled callbacks.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'
import { logger } from '#lib/frontend-logger'

import { tenantQueries } from './query-keys/tenant-keys'
import { tenantInvitationQueries } from './query-keys/tenant-invitation-keys'
import { tenantInviteMutations } from './query-keys/tenant-invite-mutation-options'
import { leaseQueries } from './query-keys/lease-keys'

/**
 * Invite tenant - Creates a tenant_invitation record and sends the invitation email
 * via the send-tenant-invitation Edge Function. Email send is non-fatal.
 */
export function useInviteTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...tenantInviteMutations.invite(),
		onSuccess: data => {
			toast.success('Invitation sent', {
				description: `${data?.name ?? 'Tenant'} will receive an email to accept the invitation`
			})

			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantInvitationQueries.invitations() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })

			logger.info('Tenant invitation sent', {
				action: 'invite_tenant',
				metadata: { invitation_id: data?.id, email: data?.email ?? '' }
			})
		},
		onError: error => {
			handleMutationError(error, 'Send tenant invitation')
		}
	})
}

/**
 * Resend invitation by extending expiry for expired or pending invitations
 */
export function useResendInvitationMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...tenantInviteMutations.resend(),
		onSuccess: () => {
			toast.success('Invitation resent', {
				description: 'The invitation has been extended for 7 more days'
			})

			queryClient.invalidateQueries({ queryKey: tenantInvitationQueries.invitations() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })

			logger.info('Tenant invitation resent', {
				action: 'resend_invitation'
			})
		},
		onError: error => {
			handleMutationError(error, 'Resend invitation')
		}
	})
}

/**
 * Cancel a pending tenant invitation
 */
export function useCancelInvitationMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...tenantInviteMutations.cancel(),
		onSuccess: () => {
			toast.success('Invitation cancelled')

			queryClient.invalidateQueries({ queryKey: tenantInvitationQueries.invitations() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })

			logger.info('Tenant invitation cancelled', {
				action: 'cancel_invitation'
			})
		},
		onError: error => {
			handleMutationError(error, 'Cancel invitation')
		}
	})
}

/**
 * Update notification preferences for a tenant
 * Updates the notification_settings table for the tenant's user
 */
export function useUpdateNotificationPreferencesMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...tenantInviteMutations.updateNotificationPreferences(),
		onSuccess: (_data, variables) => {
			toast.success('Notification preferences updated')

			queryClient.invalidateQueries({
				queryKey: [
					...tenantQueries.detail(variables.tenant_id).queryKey,
					'notification-preferences'
				]
			})

			logger.info('Notification preferences updated', {
				action: 'update_notification_preferences',
				metadata: { tenant_id: variables.tenant_id }
			})
		},
		onError: error => {
			handleMutationError(error, 'Update notification preferences')
		}
	})
}
