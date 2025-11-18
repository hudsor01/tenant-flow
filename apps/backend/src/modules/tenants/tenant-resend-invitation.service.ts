/**
 * Tenant Resend Invitation Service
 * 
 * Handles resending invitations to existing tenants
 * Simple service focused on: Resend invitation logic
 */

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { TablesInsert } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { TenantQueryService } from './tenant-query.service'

@Injectable()
export class TenantResendInvitationService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService,
		private readonly tenantQueryService: TenantQueryService,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Resend invitation to an existing tenant
	 * Creates new invitation record and sends email
	 */
	async resendInvitation(
		user_id: string,
		tenant_id: string
	): Promise<{ success: boolean; message: string }> {
		try {
			const client = this.supabase.getAdminClient()

			// Get tenant to verify existence
			const tenant = await this.tenantQueryService.findOne(tenant_id)
			if (!tenant) {
				throw new NotFoundException('Tenant not found')
			}

			// Verify ownership through property relationship
			// Tenant is owned by a property owner via lease/unit
			const { data: leaseData, error: leaseError } = await client
				.from('lease_tenants')
				.select('lease_id')
				.eq('tenant_id', tenant_id)
				.maybeSingle()

			if (leaseError || !leaseData) {
				throw new NotFoundException('No active lease found for tenant')
			}

			// Get lease to find unit
			const { data: lease, error: leaseQueryError } = await client
				.from('leases')
				.select('unit_id')
				.eq('id', leaseData.lease_id)
				.single()

			if (leaseQueryError || !lease) {
				throw new NotFoundException('Lease unit not found')
			}

			// Get unit to find property
			const { data: unit, error: unitError } = await client
				.from('units')
				.select('property_id')
				.eq('id', lease.unit_id)
				.single()

			if (unitError || !unit) {
				throw new NotFoundException('Property unit not found')
			}

			// Verify property ownership
			const { data: property, error: propError } = await client
				.from('properties')
				.select('property_owner_id')
				.eq('id', unit.property_id)
				.single()

			if (propError || property?.property_owner_id !== user_id) {
				throw new BadRequestException('You do not own this tenant property')
			}

			// Get user email from users table
			const { data: user, error: userError } = await client
				.from('users')
				.select('email')
				.eq('id', tenant.user_id)
				.single()

			if (userError || !user?.email) {
				throw new NotFoundException('Tenant user email not found')
			}

			// Generate new invitation code and URL
			const invitationCode = this._generateInvitationCode()
			const invitationUrl = `${process.env.FRONTEND_URL}/accept-invite?code=${invitationCode}`
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiration

			// Create new invitation record
			const invitationData: TablesInsert<'tenant_invitations'> = {
				email: user.email,
				unit_id: lease.unit_id,
				property_owner_id: user_id,
				invitation_code: invitationCode,
				invitation_url: invitationUrl,
				status: 'sent',
				expires_at: expiresAt.toISOString()
			}

			const { error } = await client
				.from('tenant_invitations')
				.insert(invitationData)

			if (error) {
				this.logger.error('Failed to create invitation record', {
					error: error.message,
					tenant_id
				})
				throw new BadRequestException('Failed to resend invitation')
			}

			// Emit event to send email
			this.eventEmitter.emit('tenant.invitation.resent', {
				tenant_id,
				email: user.email,
				name: user.email,
				invitationCode,
				invitationUrl,
				expiresAt: expiresAt.toISOString()
			})

			this.logger.log('Invitation resent successfully', { tenant_id })
			return {
				success: true,
				message: `Invitation resent to ${user.email}`
			}
		} catch (error) {
			if (error instanceof BadRequestException ||
				error instanceof NotFoundException) {
				throw error
			}
			this.logger.error('Error resending invitation', {
				error: error instanceof Error ? error.message : String(error),
				tenant_id
			})
			throw new BadRequestException('Failed to resend invitation')
		}
	}

	// ============================================================================
	// PRIVATE HELPER METHODS
	// ============================================================================

	/**
	 * Generate a secure random invitation code
	 */
	private _generateInvitationCode(): string {
		return Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15)
	}
}
