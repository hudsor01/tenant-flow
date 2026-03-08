/**
 * Tenant Invitation Mutation Hooks
 * TanStack Query mutation hooks for tenant invitations and notification preferences.
 *
 * Split from use-tenant-mutations.ts for the 300-line file size rule.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'
import { logger } from '#lib/frontend-logger.js'
import type { TenantWithExtras } from '#types/core'

import { tenantQueries } from './query-keys/tenant-keys'
import { leaseQueries } from './query-keys/lease-keys'
import { mutationKeys } from './mutation-keys'

/**
 * Invite tenant - Creates a tenant_invitation record in the database.
 * The email invite sending is deferred to Phase 55 (Edge Function).
 * TODO(phase-55): send invitation email via Edge Function after creating invitation record
 */
export function useInviteTenantMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.invite,
		mutationFn: async (data: {
			email: string
			first_name: string
			last_name: string
			phone: string | null
			lease_id: string
		}): Promise<TenantWithExtras> => {
			const supabase = createClient()

			// Get lease details to populate invitation (property_id, unit_id)
			const { data: lease, error: leaseError } = await supabase
				.from('leases')
				.select('id, unit_id, owner_user_id, units(property_id)')
				.eq('id', data.lease_id)
				.single()

			if (leaseError) handlePostgrestError(leaseError, 'leases')

			// Generate invitation code and URL
			const invitationCode = crypto.randomUUID()
			const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3050'
			const invitationUrl = `${appBaseUrl}/auth/accept-invitation?code=${invitationCode}`
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

			const leaseUnit = Array.isArray(lease?.units) ? lease?.units[0] : lease?.units

			// Create tenant_invitation record
			const { data: invitation, error: inviteError } = await supabase
				.from('tenant_invitations')
				.insert({
					email: data.email,
					owner_user_id: lease!.owner_user_id,
					lease_id: data.lease_id,
					unit_id: lease!.unit_id ?? null,
					property_id: leaseUnit?.property_id ?? null,
					invitation_code: invitationCode,
					invitation_url: invitationUrl,
					expires_at: expiresAt,
					status: 'sent',
					type: 'lease_signing'
				})
				.select()
				.single()

			if (inviteError) handlePostgrestError(inviteError, 'tenant_invitations')

			// Invitation record created — email delivery handled by DB trigger/webhook
			// Return a TenantWithExtras-compatible shape from the invitation
			return {
				id: invitation!.id,
				user_id: invitation!.owner_user_id,
				email: invitation!.email,
				name: `${data.first_name} ${data.last_name}`.trim(),
				invitation_status: invitation!.status
			} as TenantWithExtras
		},
		onSuccess: data => {
			toast.success('Invitation sent', {
				description: `${data?.name ?? 'Tenant'} will receive an email to accept the invitation`
			})

			queryClient.invalidateQueries({ queryKey: tenantQueries.lists() })
			queryClient.invalidateQueries({ queryKey: tenantQueries.invitations() })
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
		mutationKey: mutationKeys.tenants.resendInvite,
		mutationFn: async (invitationId: string): Promise<{ message: string }> => {
			const supabase = createClient()
			const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

			const { error } = await supabase
				.from('tenant_invitations')
				.update({
					expires_at: newExpiry,
					status: 'sent'
				})
				.eq('id', invitationId)

			if (error) handlePostgrestError(error, 'tenant_invitations')
			return { message: 'Invitation resent' }
		},
		onSuccess: () => {
			toast.success('Invitation resent', {
				description: 'The invitation has been extended for 7 more days'
			})

			queryClient.invalidateQueries({ queryKey: tenantQueries.invitations() })
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
		mutationKey: mutationKeys.tenants.cancelInvite,
		mutationFn: async (invitationId: string): Promise<{ message: string }> => {
			const supabase = createClient()

			const { error } = await supabase
				.from('tenant_invitations')
				.update({ status: 'cancelled' })
				.eq('id', invitationId)

			if (error) handlePostgrestError(error, 'tenant_invitations')
			return { message: 'Invitation cancelled' }
		},
		onSuccess: () => {
			toast.success('Invitation cancelled')

			queryClient.invalidateQueries({ queryKey: tenantQueries.invitations() })
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
		mutationKey: mutationKeys.tenants.updateNotificationPreferences,
		mutationFn: async ({
			tenant_id,
			preferences
		}: {
			tenant_id: string
			preferences: {
				emailNotifications: boolean
				smsNotifications: boolean
				maintenanceUpdates: boolean
				paymentReminders: boolean
			}
		}) => {
			const supabase = createClient()

			// First get the user_id for this tenant
			const { data: tenant, error: tenantError } = await supabase
				.from('tenants')
				.select('user_id')
				.eq('id', tenant_id)
				.single()

			if (tenantError) handlePostgrestError(tenantError, 'tenants')

			// Update notification_settings for that user
			const { error } = await supabase
				.from('notification_settings')
				.update({
					email: preferences.emailNotifications,
					sms: preferences.smsNotifications,
					maintenance: preferences.maintenanceUpdates,
					general: preferences.paymentReminders
				})
				.eq('user_id', tenant!.user_id)

			if (error) handlePostgrestError(error, 'notification_settings')
		},
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
