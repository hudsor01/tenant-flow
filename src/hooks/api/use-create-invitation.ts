/**
 * Unified Invitation Creation Hook
 *
 * Single entrypoint for all invitation creation:
 * - Type derivation (lease_id present = lease_signing, else platform_access)
 * - Duplicate detection (pre-check + 23505 race condition fallback)
 * - DB insert into tenant_invitations
 * - Email send via sendInvitationEmail Edge Function
 * - Standardized cache invalidation (tenants, invitations, dashboard)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError } from '#lib/mutation-error-handler'
import { INVITATION_ACCEPT_PATH } from '#lib/constants/routes'
import { sendInvitationEmail } from './query-keys/tenant-invite-mutation-options'
import { tenantQueries } from './query-keys/tenant-keys'
import { tenantInvitationQueries } from './query-keys/tenant-invitation-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'
import { mutationKeys } from './mutation-keys'
import { toast } from 'sonner'
import { logger } from '#lib/frontend-logger'
import type { Tables } from '#types/supabase'

export type CreateInvitationParams = {
	email: string
	lease_id?: string | undefined
	property_id?: string | undefined
	unit_id?: string | undefined
}

type InvitationRecord = Pick<
	Tables<'tenant_invitations'>,
	'id' | 'email' | 'status' | 'created_at' | 'expires_at' | 'invitation_url'
>

export type CreateInvitationResult =
	| { status: 'created'; invitation: InvitationRecord }
	| { status: 'duplicate'; existing: InvitationRecord }

async function createInvitation(
	params: CreateInvitationParams
): Promise<CreateInvitationResult> {
	const user = await getCachedUser()
	if (!user) throw new Error('Not authenticated')

	const supabase = createClient()

	// Pre-check for duplicate (D-01)
	const { data: existingInvitations } = await supabase
		.from('tenant_invitations')
		.select('id, email, status, created_at, expires_at, invitation_url')
		.eq('email', params.email)
		.eq('owner_user_id', user.id)
		.in('status', ['pending', 'sent'])
		.limit(1)

	const existingMatch = existingInvitations?.[0]
	if (existingMatch) {
		return { status: 'duplicate', existing: existingMatch }
	}

	// Derive type (D-03)
	const invitationType = params.lease_id ? 'lease_signing' : 'platform_access'

	// Generate code and URL (D-04, D-08)
	const invitationCode = crypto.randomUUID()
	const appBaseUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3050'
	const invitationUrl = `${appBaseUrl}${INVITATION_ACCEPT_PATH}?code=${invitationCode}`

	// Insert invitation (expires_at uses DB default: now() + 7 days)
	const { data: invitation, error: insertError } = await supabase
		.from('tenant_invitations')
		.insert({
			email: params.email,
			owner_user_id: user.id,
			property_id: params.property_id ?? null,
			unit_id: params.unit_id ?? null,
			lease_id: params.lease_id ?? null,
			invitation_code: invitationCode,
			invitation_url: invitationUrl,
			status: 'sent',
			type: invitationType
		})
		.select('id, email, status, created_at, expires_at, invitation_url')
		.single()

	// Handle 23505 race condition
	if (insertError?.code === '23505') {
		const { data: raceExisting } = await supabase
			.from('tenant_invitations')
			.select('id, email, status, created_at, expires_at, invitation_url')
			.eq('email', params.email)
			.eq('owner_user_id', user.id)
			.in('status', ['pending', 'sent'])
			.limit(1)

		const raceMatch = raceExisting?.[0]
		if (raceMatch) {
			return { status: 'duplicate', existing: raceMatch }
		}
	}

	// Handle other errors
	if (insertError) {
		handlePostgrestError(insertError, 'tenant_invitations')
	}

	if (!invitation) {
		throw new Error('Failed to create invitation record')
	}

	// Send email (non-fatal -- D-10, D-11)
	await sendInvitationEmail(invitation.id).catch(err => {
		logger.error('[create-invitation] Email send failed', { metadata: { invitation_id: invitation.id } }, err)
	})

	return { status: 'created', invitation }
}

export function useCreateInvitation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.tenants.invite,
		mutationFn: createInvitation,
		onSuccess: (result) => {
			// Standardized invalidation per D-12
			queryClient.invalidateQueries({ queryKey: tenantQueries.all() })
			queryClient.invalidateQueries({
				queryKey: tenantInvitationQueries.invitations()
			})
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })

			if (result.status === 'created') {
				toast.success('Invitation sent', {
					description: 'An invitation email has been sent'
				})
				logger.info('Tenant invitation created', {
					action: 'create_invitation',
					metadata: {
						invitation_id: result.invitation.id,
						email: result.invitation.email
					}
				})
			}
			// Duplicate case: caller decides UI (no toast from hook -- per D-02)
		},
		onError: (error) => {
			handleMutationError(error, 'Send invitation')
		}
	})
}
