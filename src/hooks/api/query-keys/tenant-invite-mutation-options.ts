/**
 * Tenant Invitation Mutation Options
 * mutationOptions() factories for tenant invitation mutations.
 *
 * Contains ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled callbacks stay in hook files.
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type { TenantWithExtras } from '#types/core'
import { mutationKeys } from '../mutation-keys'

// ============================================================================
// EMAIL SEND HELPER
// ============================================================================

/**
 * Call the send-tenant-invitation Edge Function to send the invitation email.
 * Non-fatal: if this fails, the invitation DB record is preserved. The caller
 * should warn the user but not treat it as a mutation failure.
 */
async function sendInvitationEmail(invitationId: string): Promise<void> {
	const supabase = createClient()
	const {
		data: { session }
	} = await supabase.auth.getSession()
	if (!session?.access_token) {
		console.warn('[send-invitation-email] No session, skipping email send')
		return
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(
		`${supabaseUrl}/functions/v1/send-tenant-invitation`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session.access_token}`
			},
			body: JSON.stringify({ invitation_id: invitationId })
		}
	)

	if (!response.ok) {
		console.error(
			'[send-invitation-email] Edge Function returned',
			response.status
		)
	}
}

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const tenantInviteMutations = {
	invite: () =>
		mutationOptions({
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
				const appBaseUrl =
					process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3050'
				const invitationUrl = `${appBaseUrl}/auth/accept-invitation?code=${invitationCode}`
				const expiresAt = new Date(
					Date.now() + 7 * 24 * 60 * 60 * 1000
				).toISOString()

				const leaseUnit = Array.isArray(lease?.units)
					? lease?.units[0]
					: lease?.units

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

				if (inviteError)
					handlePostgrestError(inviteError, 'tenant_invitations')

				// Send invitation email (non-fatal -- DB record preserved if email fails)
				await sendInvitationEmail(invitation!.id).catch(err => {
					console.error('[invite] Email send failed:', err)
				})

				// Return a TenantWithExtras-compatible shape from the invitation
				return {
					id: invitation!.id,
					user_id: invitation!.owner_user_id,
					email: invitation!.email,
					name: `${data.first_name} ${data.last_name}`.trim(),
					invitation_status: invitation!.status
				} as TenantWithExtras
			}
		}),

	resend: () =>
		mutationOptions({
			mutationKey: mutationKeys.tenants.resendInvite,
			mutationFn: async (
				invitationId: string
			): Promise<{ message: string }> => {
				const supabase = createClient()
				const newExpiry = new Date(
					Date.now() + 7 * 24 * 60 * 60 * 1000
				).toISOString()

				const { error } = await supabase
					.from('tenant_invitations')
					.update({
						expires_at: newExpiry,
						status: 'sent'
					})
					.eq('id', invitationId)

				if (error) handlePostgrestError(error, 'tenant_invitations')

				// Re-send invitation email (non-fatal)
				await sendInvitationEmail(invitationId).catch(err => {
					console.error('[resend] Email send failed:', err)
				})

				return { message: 'Invitation resent' }
			}
		}),

	cancel: () =>
		mutationOptions({
			mutationKey: mutationKeys.tenants.cancelInvite,
			mutationFn: async (
				invitationId: string
			): Promise<{ message: string }> => {
				const supabase = createClient()

				const { error } = await supabase
					.from('tenant_invitations')
					.update({ status: 'cancelled' })
					.eq('id', invitationId)

				if (error) handlePostgrestError(error, 'tenant_invitations')
				return { message: 'Invitation cancelled' }
			}
		}),

	updateNotificationPreferences: () =>
		mutationOptions({
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
			}
		})
}
