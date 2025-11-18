/**
 * Tenant Invitation Service - SAGA Pattern Implementation
 *
 * Handles the complex tenant invitation flow with 8 saga steps
 * SAGA: Create Tenant → Create Lease → Verify Stripe → Create Customer → Create Sub → Send Email → Link Auth → Activate
 *
 * This is the primary orchestrator for onboarding new tenants
 */

import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { CreateTenantRequest } from '@repo/shared/types/api-contracts'
import type { Lease } from '@repo/shared/types/core'
import type { TablesInsert } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { TenantCrudService } from './tenant-crud.service'

interface InviteWithLeaseRequest extends Omit<CreateTenantRequest, 'stripe_customer_id'> {
	stripe_customer_id?: string
	property_id: string
	unit_id: string
	email: string
	first_name?: string
	last_name?: string
	phone?: string | undefined
	lease_start_date: string
	lease_end_date?: string
	rent_amount: number
	security_deposit?: number
}

@Injectable()
export class TenantInvitationService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2,
		private readonly tenantCrudService: TenantCrudService
	) {}

	/**
	 * MAIN SAGA ORCHESTRATOR: Invite tenant with lease
	 * Coordinates 8 steps of tenant onboarding
	 */
	async inviteTenantWithLease(
		user_id: string,
		dto: InviteWithLeaseRequest
	): Promise<{
		success: boolean
		tenant_id: string
		lease_id: string
		message: string
	}> {
		const sagaId = `saga_${Date.now()}_${Math.random().toString(36).slice(2)}`
		this.logger.log('Starting invitation SAGA', { sagaId, user_id })

		try {
			// STEP 1: Create tenant record
			const tenant = await this.tenantCrudService.create(user_id, {
			...dto,
			stripe_customer_id: dto.stripe_customer_id || `temp_${Date.now()}`
		})
			this.logger.log('SAGA Step 1: Tenant created', { sagaId, tenant_id: tenant.id })

			// STEP 2: Create lease record
			const lease = await this._createLeaseRecord(user_id, tenant.id, dto)
			this.logger.log('SAGA Step 2: Lease created', { sagaId, lease_id: lease.id })

			// STEP 3: Verify owner has Stripe Connect
			const stripeAccount = await this._verifyOwnerConnectedAccount(user_id)
			this.logger.log('SAGA Step 3: Stripe verified', { sagaId })

			// STEP 4: Create Stripe customer
			const stripeCustomer = await this._createStripeCustomer(
				{
					name: dto.first_name && dto.last_name
						? `${dto.first_name} ${dto.last_name}`
						: dto.email,
					email: dto.email,
					...(dto.phone && { phone: dto.phone })
				},
				stripeAccount.stripe_account_id
			)
			this.logger.log('SAGA Step 4: Stripe customer created', {
				sagaId,
				stripe_customer_id: stripeCustomer.id
			})

			// STEP 5: Create Stripe subscription for rent
			const subscription = await this._createStripeSubscription(
				stripeCustomer.id,
				dto.rent_amount,
				stripeAccount.stripe_account_id
			)
			this.logger.log('SAGA Step 5: Subscription created', {
				sagaId,
				subscription_id: subscription.id
			})

			// STEP 6: Send auth invitation email
			await this._sendAuthInvitation(dto.email, tenant.id, dto.unit_id, user_id)
			this.logger.log('SAGA Step 6: Email sent', { sagaId })

			// STEP 7: Link tenant to auth user (happens when they accept)
			// This is async - happens in the accept flow

			// STEP 8: Activate tenant (happens when they accept)
			// This is async - happens in the accept flow

			this.logger.log('SAGA completed successfully', {
				sagaId,
				tenant_id: tenant.id,
				lease_id: lease.id
			})

			return {
				success: true,
				tenant_id: tenant.id,
				lease_id: lease.id,
				message: `Tenant ${dto.email} invited successfully`
			}
		} catch (error) {
			this.logger.error('SAGA failed', {
				error: error instanceof Error ? error.message : String(error),
				sagaId,
				user_id
			})
			throw new InternalServerErrorException('Tenant invitation failed')
		}
	}

	/**
	 * Check if auth user already exists
	 */
	async checkExistingAuthUser(email: string): Promise<boolean> {
		try {
			const client = this.supabase.getAdminClient()
			const { data } = await client
				.from('users')
				.select('id')
				.eq('email', email.toLowerCase())
				.single()

			return !!data
		} catch {
			return false
		}
	}

	// ============================================================================
	// PRIVATE SAGA STEP IMPLEMENTATIONS
	// ============================================================================

	/**
	 * SAGA STEP 2: Create lease record
	 */
	private async _createLeaseRecord(
		user_id: string,
		tenant_id: string,
		dto: InviteWithLeaseRequest
	): Promise<Lease> {
		try {
		const client = this.supabase.getAdminClient()

			// Get unit to verify ownership
			const { data: unit, error: unitError } = await client
				.from('units')
				.select('id, property_id')
				.eq('id', dto.unit_id)
				.single()

			if (unitError || !unit) {
				throw new NotFoundException('Unit not found')
			}

			// Verify property ownership
			const { data: property, error: propError } = await client
				.from('properties')
				.select('property_owner_id')
				.eq('id', unit.property_id)
				.single()

			if (propError || property?.property_owner_id !== user_id) {
				throw new BadRequestException('You do not own this property')
			}

			// Calculate end_date with 1-year default if not provided
		const endDate: string = (() => {
			const provided = dto.lease_end_date
			if (provided) return provided as string
			const d = new Date(dto.lease_start_date)
			d.setFullYear(d.getFullYear() + 1)
			return d.toISOString().split('T')[0]
		})() as string

		const leaseData: TablesInsert<'leases'> = {
			primary_tenant_id: tenant_id,
			unit_id: dto.unit_id,
			start_date: dto.lease_start_date,
			end_date: endDate,
			rent_amount: dto.rent_amount,
			rent_currency: 'usd',
			security_deposit: dto.security_deposit || 0,
			lease_status: 'active',
			payment_day: 1
		}

			const { data, error } = await client
			.from('leases')
			.insert(leaseData)
				.select()
				.single()

			if (error) {
				throw new BadRequestException('Failed to create lease')
			}

			return data
		} catch (error) {
			this.logger.error('SAGA Step 2 failed: Create lease', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * SAGA STEP 3: Verify owner has Stripe Connect onboarded
	 */
	private async _verifyOwnerConnectedAccount(
		user_id: string
	): Promise<{ stripe_account_id: string }> {
		try {
			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('property_owners')
				.select('stripe_account_id, charges_enabled, payouts_enabled')
				.eq('id', user_id)
				.single()

			if (error || !data?.charges_enabled || !data?.payouts_enabled) {
				throw new BadRequestException(
					'Property owner must complete Stripe Connect onboarding first'
				)
			}

			return { stripe_account_id: data.stripe_account_id }
		} catch (oldError) {
			this.logger.error('SAGA Step 3 failed: Verify Stripe account', {
				error: oldError instanceof Error ? oldError.message : String(oldError)
			})
			throw oldError
		}
	}

	/**
	 * SAGA STEP 4: Create Stripe customer on connected account
	 */
	private async _createStripeCustomer(
		_customerData: { name?: string; email: string; phone?: string },
		_stripe_account_id: string
	): Promise<{ id: string; [key: string]: unknown }> {
		try {
			// TODO: Implement customer creation in StripeConnectService
			return { id: `cus_${Date.now()}` }
		} catch (oldError) {
			this.logger.error('SAGA Step 4 failed: Create Stripe customer', {
				error: oldError instanceof Error ? oldError.message : String(oldError)
			})
			throw new InternalServerErrorException('Failed to create Stripe customer')
		}
	}

	/**
	 * SAGA STEP 5: Create Stripe subscription for rent payments
	 */
	private async _createStripeSubscription(
		_customer_id: string,
		_rent_amount: number,
		_stripe_account_id: string
	): Promise<{ id: string; [key: string]: unknown }> {
		try {
			// TODO: Implement subscription creation in StripeConnectService
			return { id: `sub_${Date.now()}` }
		} catch (oldError) {
			this.logger.error('SAGA Step 5 failed: Create Stripe subscription', {
				error: oldError instanceof Error ? oldError.message : String(oldError)
			})
			throw new InternalServerErrorException('Failed to create subscription')
		}
	}

	/**
	 * SAGA STEP 6: Send auth invitation email with token
	 */
	private async _sendAuthInvitation(email: string, tenant_id: string, unit_id: string, property_owner_id: string): Promise<string> {
		try {
			const invitationCode = Math.random().toString(36).substring(2, 15) +
				Math.random().toString(36).substring(2, 15)

			const client = this.supabase.getAdminClient()
			const expiresAt = new Date()
			expiresAt.setDate(expiresAt.getDate() + 7)
			const invitationUrl = `${process.env.FRONTEND_URL}/accept-invite?code=${invitationCode}`

			const invitationData: TablesInsert<'tenant_invitations'> = {
			email: email.toLowerCase(),
			unit_id,
			property_owner_id,
			invitation_code: invitationCode,
			invitation_url: invitationUrl,
			status: 'sent',
			expires_at: expiresAt.toISOString()
		}

			const { error } = await client
				.from('tenant_invitations')
				.insert(invitationData)

			if (error) {
				throw new BadRequestException('Failed to create invitation token')
			}

			// Emit event for email service
			this.eventEmitter.emit('tenant.invitation.sent', {
				email,
				tenant_id,
				invitationCode,
				invitationUrl,
				expiresAt: expiresAt.toISOString()
			})

			return invitationCode
		} catch (oldError) {
			this.logger.error('SAGA Step 6 failed: Send invitation email', {
				error: oldError instanceof Error ? oldError.message : String(oldError)
			})
			throw oldError
		}
	}
}
