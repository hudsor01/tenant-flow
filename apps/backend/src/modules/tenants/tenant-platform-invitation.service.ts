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
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { randomBytes } from 'crypto'
import { AppConfigService } from '../../config/app-config.service'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

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
		private readonly logger: AppLogger,
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2,
		private readonly config: AppConfigService
	) {}

	private requireUserClient(token?: string) {
		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}
		return this.supabase.getUserClient(token)
	}

	/**
	 * Invite a tenant to join the platform (no lease required)
	 */
	async inviteToPlatform(
		ownerId: string,
		dto: InviteToPlatformRequest,
		token: string
	): Promise<InviteToPlatformResponse> {
		this.logger.log('Inviting tenant to platform', {
			ownerId,
			email: dto.email
		})

		const client = this.requireUserClient(token)

		try {
			// Step 1: If property_id provided, verify ownership
			if (dto.property_id) {
				const { data: property, error: propError } = await client
					.from('properties')
					.select('id, owner_user_id')
					.eq('id', dto.property_id)
					.single()

				if (propError || !property || property.owner_user_id !== ownerId) {
					this.logger.warn(
						'Tenant invitation failed: Property ownership verification failed',
						{
							ownerId,
							property_id: dto.property_id,
							email: dto.email,
							error: propError?.message,
							reason: !property ? 'property_not_found' : 'ownership_mismatch'
						}
					)
					throw new BadRequestException(
						'Property does not belong to this owner'
					)
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
					this.logger.warn(
						'Tenant invitation failed: Unit verification failed',
						{
							ownerId,
							property_id: dto.property_id,
							unit_id: dto.unit_id,
							email: dto.email,
							error: unitError?.message,
							reason: !unit ? 'unit_not_found' : 'unit_property_mismatch'
						}
					)
					throw new BadRequestException(
						'Unit does not belong to the specified property'
					)
				}
			}

			// Step 3b: Check plan limit before allowing invitation
			const { data: limits, error: limitsError } = await this.supabase
				.getAdminClient()
				.rpc('get_user_plan_limits', { p_user_id: ownerId })
			if (limitsError) {
				this.logger.error('Failed to fetch plan limits', { error: limitsError })
				throw new InternalServerErrorException('Could not verify plan limits')
			}
			const tenantLimit: number = (limits as Array<{ tenant_limit: number }> | null)?.[0]?.tenant_limit ?? 25

			// Count active tenants owned by this owner (via leases)
			const { count: currentTenantCount } = await client
				.from('leases')
				.select('primary_tenant_id', { count: 'exact', head: true })
				.eq('owner_user_id', ownerId)
				.eq('lease_status', 'active')

			if (currentTenantCount !== null && currentTenantCount >= tenantLimit) {
				throw new ForbiddenException({
					code: 'PLAN_LIMIT_EXCEEDED',
					message: `Your plan allows up to ${tenantLimit} tenant${tenantLimit === 1 ? '' : 's'}. Upgrade to invite more.`,
					limit: tenantLimit,
					current: currentTenantCount,
					resource: 'tenants'
				})
			}

			// Step 4: Check for existing pending invitation
			const { data: existingInvite } = await client
				.from('tenant_invitations')
				.select('id, status')
				.eq('email', dto.email.toLowerCase())
				.eq('owner_user_id', ownerId)
				.in('status', ['pending', 'sent'])
				.maybeSingle()

			if (existingInvite) {
				this.logger.warn(
					'Tenant invitation failed: Duplicate pending invitation',
					{
						ownerId,
						email: dto.email,
						property_id: dto.property_id,
						existing_invitation_id: existingInvite.id,
						existing_status: existingInvite.status
					}
				)
				throw new BadRequestException(
					'A pending invitation already exists for this email. Cancel it first or use resend.'
				)
			}

			// Step 5: Generate secure invitation code (64 hex chars from 32 bytes)
			const invitationCode = randomBytes(32).toString('hex')
			const invitationUrl = `${this.config.getNextPublicAppUrl()}/accept-invite?code=${invitationCode}`

			// Step 6: Set expiry to 7 days from now
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7)

			// Step 7: Create invitation record
			const { data: invitation, error: insertError } = await client
				.from('tenant_invitations')
				.insert({
					email: dto.email.toLowerCase(),
					owner_user_id: ownerId,
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
				this.logger.error('Tenant invitation failed: Database insert error', {
					ownerId,
					email: dto.email,
					property_id: dto.property_id,
					unit_id: dto.unit_id,
					error: insertError?.message,
					error_code: insertError?.code
				})
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
		} catch (error) {
			// Re-throw known exceptions (NotFoundException, BadRequestException, ForbiddenException)
			if (
				error instanceof NotFoundException ||
				error instanceof BadRequestException ||
				error instanceof ForbiddenException
			) {
				throw error
			}

			// Log and wrap unexpected errors
			this.logger.error('Tenant invitation failed: Unexpected error', {
				ownerId,
				email: dto.email,
				property_id: dto.property_id,
				unit_id: dto.unit_id,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			})
			throw new BadRequestException(
				'An unexpected error occurred while creating the invitation'
			)
		}
	}

	/**
	 * Cancel a pending invitation
	 */
	async cancelInvitation(
		ownerId: string,
		invitationId: string,
		token: string
	): Promise<void> {
		const client = this.requireUserClient(token)

		// Get invitation
		const { data: invitation, error: fetchError } = await client
			.from('tenant_invitations')
			.select('id, status, owner_user_id')
			.eq('id', invitationId)
			.single()

		if (fetchError || !invitation) {
			throw new NotFoundException('Invitation not found')
		}

		if (invitation.owner_user_id !== ownerId) {
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
	async resendInvitation(
		ownerId: string,
		invitationId: string,
		token: string
	): Promise<void> {
		const client = this.requireUserClient(token)

		// Get invitation
		const { data: invitation, error: fetchError } = await client
			.from('tenant_invitations')
			.select(
				'id, status, email, invitation_code, invitation_url, owner_user_id, property_id, unit_id'
			)
			.eq('id', invitationId)
			.single()

		if (fetchError || !invitation) {
			throw new NotFoundException('Invitation not found')
		}

		if (invitation.owner_user_id !== ownerId) {
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
			invitationUrl = `${this.config.getNextPublicAppUrl()}/accept-invite?code=${invitationCode}`
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
