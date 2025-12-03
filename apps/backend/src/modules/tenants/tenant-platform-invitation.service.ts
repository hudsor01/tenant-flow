/**
 * TenantPlatformInvitationService
 *
 * Handles inviting tenants to the platform WITHOUT creating a lease.
 * This separates the "platform invitation" from "lease signing" workflows.
 *
 * Key differences from TenantInvitationService (legacy):
 * - NO lease creation
 * - NO Stripe customer/subscription creation
 * - NO Stripe Connect requirement
 * - Simpler flow: just create invitation and send email
 *
 * The lease creation happens AFTER the tenant accepts the invitation,
 * as a separate workflow with proper signature collection.
 */

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { randomBytes } from 'crypto'
import { SupabaseService } from '../../database/supabase.service'

export interface InviteToPlatformRequest {
	email: string
	first_name: string
	last_name: string
	phone?: string
	property_id?: string
	unit_id?: string
}

export interface InviteToPlatformResponse {
	success: boolean
	invitation_id: string
	message: string
}

@Injectable()
export class TenantPlatformInvitationService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Invite a tenant to join the platform (no lease required)
	 */
	async inviteToPlatform(
		ownerId: string,
		dto: InviteToPlatformRequest
	): Promise<InviteToPlatformResponse> {
		this.logger.log('Inviting tenant to platform', { ownerId, email: dto.email })

		const client = this.supabase.getAdminClient()

		// Step 1: Verify owner exists
		const { data: owner, error: ownerError } = await client
			.from('property_owners')
			.select('id, user_id')
			.eq('user_id', ownerId)
			.maybeSingle()

		if (ownerError || !owner) {
			throw new NotFoundException('Property owner not found')
		}

		// Step 2: If property_id provided, verify ownership
		if (dto.property_id) {
			const { data: property, error: propError } = await client
				.from('properties')
				.select('id, property_owner_id')
				.eq('id', dto.property_id)
				.single()

			if (propError || !property || property.property_owner_id !== owner.id) {
				throw new BadRequestException('Property does not belong to this owner')
			}
		}

		// Step 3: If unit_id provided, verify it belongs to the property
		if (dto.unit_id && dto.property_id) {
			const { data: unit, error: unitError } = await client
				.from('units')
				.select('id, property_id')
				.eq('id', dto.unit_id)
				.single()

			if (unitError || !unit || unit.property_id !== dto.property_id) {
				throw new BadRequestException('Unit does not belong to the specified property')
			}
		}

		// Step 4: Check for existing pending invitation
		const { data: existingInvite } = await client
			.from('tenant_invitations')
			.select('id, status')
			.eq('email', dto.email.toLowerCase())
			.eq('property_owner_id', owner.id)
			.in('status', ['pending', 'sent'])
			.maybeSingle()

		if (existingInvite) {
			throw new BadRequestException(
				'A pending invitation already exists for this email. Cancel it first or use resend.'
			)
		}

		// Step 5: Generate secure invitation code (64 hex chars from 32 bytes)
		const invitationCode = randomBytes(32).toString('hex')
		const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?code=${invitationCode}`

		// Step 6: Set expiry to 7 days from now
		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + 7)

		// Step 7: Create invitation record
		const { data: invitation, error: insertError } = await client
			.from('tenant_invitations')
			.insert({
				email: dto.email.toLowerCase(),
				property_owner_id: owner.id,
				property_id: dto.property_id || null,
				unit_id: dto.unit_id || null,
				invitation_code: invitationCode,
				invitation_url: invitationUrl,
				status: 'sent',
				type: 'platform_access',
				expires_at: expiresAt.toISOString()
			})
			.select('id')
			.single()

		if (insertError || !invitation) {
			this.logger.error('Failed to create invitation', { error: insertError?.message })
			throw new BadRequestException('Failed to create invitation')
		}

		// Step 8: Emit event for email service
		this.eventEmitter.emit('tenant.platform_invitation.sent', {
			email: dto.email,
			first_name: dto.first_name,
			last_name: dto.last_name,
			invitation_id: invitation.id,
			invitation_url: invitationUrl,
			expires_at: expiresAt.toISOString(),
			property_id: dto.property_id,
			unit_id: dto.unit_id
		})

		this.logger.log('Platform invitation sent successfully', {
			invitation_id: invitation.id,
			email: dto.email
		})

		return {
			success: true,
			invitation_id: invitation.id,
			message: `${dto.first_name} ${dto.last_name} has been invited to join the platform`
		}
	}

	/**
	 * Cancel a pending invitation
	 */
	async cancelInvitation(ownerId: string, invitationId: string): Promise<void> {
		const client = this.supabase.getAdminClient()

		// Verify owner
		const { data: owner } = await client
			.from('property_owners')
			.select('id')
			.eq('user_id', ownerId)
			.maybeSingle()

		if (!owner) {
			throw new NotFoundException('Property owner not found')
		}

		// Get invitation
		const { data: invitation, error: fetchError } = await client
			.from('tenant_invitations')
			.select('id, status, property_owner_id')
			.eq('id', invitationId)
			.single()

		if (fetchError || !invitation) {
			throw new NotFoundException('Invitation not found')
		}

		if (invitation.property_owner_id !== owner.id) {
			throw new BadRequestException('Invitation does not belong to this owner')
		}

		if (invitation.status === 'accepted') {
			throw new BadRequestException('Cannot cancel an accepted invitation')
		}

		// Update status to cancelled
		const { error: updateError } = await client
			.from('tenant_invitations')
			.update({ status: 'cancelled' })
			.eq('id', invitationId)

		if (updateError) {
			throw new BadRequestException('Failed to cancel invitation')
		}

		this.logger.log('Invitation cancelled', { invitationId, ownerId })
	}

	/**
	 * Resend an invitation (extends expiry)
	 */
	async resendInvitation(ownerId: string, invitationId: string): Promise<void> {
		const client = this.supabase.getAdminClient()

		// Verify owner
		const { data: owner } = await client
			.from('property_owners')
			.select('id')
			.eq('user_id', ownerId)
			.maybeSingle()

		if (!owner) {
			throw new NotFoundException('Property owner not found')
		}

		// Get invitation
		const { data: invitation, error: fetchError } = await client
			.from('tenant_invitations')
			.select('id, status, email, invitation_code, invitation_url, property_owner_id, property_id, unit_id')
			.eq('id', invitationId)
			.single()

		if (fetchError || !invitation) {
			throw new NotFoundException('Invitation not found')
		}

		if (invitation.property_owner_id !== owner.id) {
			throw new BadRequestException('Invitation does not belong to this owner')
		}

		if (invitation.status === 'accepted') {
			throw new BadRequestException('Cannot resend an accepted invitation')
		}

		if (invitation.status === 'cancelled') {
			throw new BadRequestException('Cannot resend a cancelled invitation')
		}

		// Generate new expiry (7 days from now)
		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + 7)

		// For expired invitations, generate new code
		let invitationCode = invitation.invitation_code
		let invitationUrl = invitation.invitation_url

		if (invitation.status === 'expired') {
			invitationCode = randomBytes(32).toString('hex')
			invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?code=${invitationCode}`
		}

		// Update invitation
		const { error: updateError } = await client
			.from('tenant_invitations')
			.update({
				expires_at: expiresAt.toISOString(),
				status: 'sent',
				invitation_code: invitationCode,
				invitation_url: invitationUrl
			})
			.eq('id', invitationId)

		if (updateError) {
			throw new BadRequestException('Failed to resend invitation')
		}

		// Emit event for email service
		this.eventEmitter.emit('tenant.platform_invitation.sent', {
			email: invitation.email,
			invitation_id: invitation.id,
			invitation_url: invitationUrl,
			expires_at: expiresAt.toISOString(),
			property_id: invitation.property_id ?? undefined,
			unit_id: invitation.unit_id ?? undefined
		})

		this.logger.log('Invitation resent', { invitationId, ownerId })
	}
}
