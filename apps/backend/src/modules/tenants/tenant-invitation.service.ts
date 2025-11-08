/**
 * Tenant Invitation Service
 *
 * Architecture:
 * - Supabase RPC for atomic database operations (1 call instead of 4+)
 * - Stripe Checkout for payment method collection (PCI compliant hosted UI)
 * - NestJS EventEmitter2 for event-driven cleanup
 * - NestJS Guards for ownership verification (declarative security)
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type Stripe from 'stripe'
import type { Tenant, Lease } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import { StripeConnectService } from '../billing/stripe-connect.service'

interface CreateTenantWithLeaseInput {
	tenantEmail: string
	tenantFirstName: string
	tenantLastName: string
	tenantPhone?: string
	propertyId: string
	unitId?: string
	rentAmount: number // In cents
	securityDeposit: number // In cents
	startDate: string
	endDate: string
}

interface TenantInvitationResult {
	success: boolean
	tenantId: string
	leaseId: string
	checkoutUrl: string
	message: string
}

@Injectable()
export class TenantInvitationService {
	private readonly logger = new Logger(
		TenantInvitationService.name
	)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeConnect: StripeConnectService,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Invite tenant with lease using modern architecture
	 *
	 * Steps:
	 * 1. Create tenant + lease (1 atomic RPC call)
	 * 2. Create Stripe Customer + Subscription (using price_data, no separate Price)
	 * 3. Create Stripe Checkout Session for payment method collection
	 * 4. Send invitation email with Checkout URL
	 * 5. Emit events for audit logging
	 *
	 * Stripe handles:
	 * - Payment method collection (Checkout UI)
	 * - Recurring billing (Stripe Billing)
	 * - Payment retries (webhooks)
	 * - PCI compliance (hosted pages)
	 *
	 * NestJS Guards handle:
	 * - Ownership verification (PropertyOwnershipGuard)
	 * - Stripe account validation (StripeConnectedGuard)
	 */
	async inviteTenantWithLease(
		ownerId: string,
		input: CreateTenantWithLeaseInput,
		connectedAccountId: string
	): Promise<TenantInvitationResult> {
		this.logger.log('Starting simplified tenant invitation', {
			ownerId,
			propertyId: input.propertyId
		})

		try {
			// Step 1: Create tenant + lease atomically (1 database call)
			const { tenant, lease } = await this.createTenantAndLease(ownerId, input)

			// Step 2: Create Stripe Customer + Subscription
			const { customer, subscription } = await this.createStripeSubscription(
				tenant,
				lease,
				connectedAccountId,
				input.rentAmount
			)

			// Step 3: Create Checkout Session for payment setup
			const checkoutSession = await this.createCheckoutSession(
				customer.id,
				subscription.id,
				connectedAccountId,
				lease.id
			)

			// Step 4: Link Stripe IDs to database
			await this.linkStripeResources(
				tenant.id,
				lease.id,
				customer.id,
				subscription.id
			)

			// Validate checkout URL
			if (!checkoutSession.url) {
				throw new BadRequestException('Failed to create checkout session URL')
			}

			// Step 5: Send invitation email with Checkout URL
			await this.sendInvitationEmail(tenant, lease, checkoutSession.url)

			// Step 6: Emit event for audit logging
			this.eventEmitter.emit('tenant.invited', {
				tenantId: tenant.id,
				leaseId: lease.id,
				ownerId,
				checkoutUrl: checkoutSession.url
			})

			this.logger.log('Tenant invitation complete', {
				tenantId: tenant.id,
				leaseId: lease.id,
				checkoutSessionId: checkoutSession.id
			})

			return {
				success: true,
				tenantId: tenant.id,
				leaseId: lease.id,
				checkoutUrl: checkoutSession.url,
				message:
					'Tenant created and invitation sent with payment setup link'
			}
		} catch (error) {
			this.logger.error('Tenant invitation failed', {
				error: error instanceof Error ? error.message : String(error),
				ownerId,
				input
			})

			// Emit failure event for cleanup (event-driven compensation)
			this.eventEmitter.emit('tenant.invitation.failed', {
				ownerId,
				error
			})

			throw error
		}
	}

	/**
	 * Create tenant + lease in single atomic RPC call
	 * Replaces: 4+ separate database calls with manual transaction logic
	 */
	private async createTenantAndLease(
		ownerId: string,
		input: CreateTenantWithLeaseInput
	): Promise<{ tenant: Tenant; lease: Lease }> {
		const client = this.supabase.getAdminClient()

		const { data, error } = await client.rpc('create_tenant_with_lease', {
			p_owner_id: ownerId,
			p_tenant_email: input.tenantEmail,
			p_tenant_first_name: input.tenantFirstName,
			p_tenant_last_name: input.tenantLastName,
			p_property_id: input.propertyId,
			p_rent_amount: input.rentAmount,
			p_security_deposit: input.securityDeposit,
			p_start_date: input.startDate,
			p_end_date: input.endDate,
			...(input.tenantPhone && { p_tenant_phone: input.tenantPhone }),
			...(input.unitId && { p_unit_id: input.unitId })
		})

		if (error || !data) {
			throw new BadRequestException(
				`Failed to create tenant: ${error?.message || 'Unknown error'}`
			)
		}

		// Cast JSON result to expected types
		const result = data as unknown as { tenant: Tenant; lease: Lease }
		return result
	}

	/**
	 * Create Stripe Customer + Subscription using price_data
	 * Replaces: Separate Price creation + Subscription creation (2 API calls)
	 */
	private async createStripeSubscription(
		tenant: Tenant,
		lease: Lease,
		connectedAccountId: string,
		rentAmountCents: number
	) {
		const stripe = this.stripeConnect.getStripe()

		// Create Customer (minimal metadata)
		const customer = await stripe.customers.create(
			{
				email: tenant.email,
				name: `${tenant.firstName} ${tenant.lastName}`,
				...(tenant.phone && { phone: tenant.phone }),
				metadata: {
					tenantId: tenant.id,
					platform: 'tenantflow'
				}
			},
			{ stripeAccount: connectedAccountId }
		)

		// Create Subscription using price_data with inline product creation
		// Stripe API Reference: https://stripe.com/docs/api/subscriptions/create
		// Using price_data with product_data creates both Price and Product inline
		const subscription = await stripe.subscriptions.create(
			{
				customer: customer.id,
				items: [
					{
						price_data: {
							currency: 'usd',
							unit_amount: rentAmountCents,
							recurring: { interval: 'month' },
							product_data: {
								name: 'Monthly Rent'
							}
						} as unknown as Stripe.SubscriptionCreateParams.Item.PriceData
					}
				],
				payment_behavior: 'default_incomplete',
				payment_settings: {
					payment_method_types: ['card'],
					save_default_payment_method: 'on_subscription'
				},
				metadata: {
					leaseId: lease.id,
					tenantId: tenant.id
				}
			},
			{ stripeAccount: connectedAccountId }
		)

		this.logger.log('Stripe subscription created', {
			customerId: customer.id,
			subscriptionId: subscription.id
		})

		return { customer, subscription }
	}

	/**
	 * Create Stripe Checkout Session for payment method collection
	 * Tenant gets professional Stripe-hosted UI for adding payment method
	 */
	private async createCheckoutSession(
		customerId: string,
		subscriptionId: string,
		connectedAccountId: string,
		leaseId: string
	) {
		const stripe = this.stripeConnect.getStripe()
		const frontendUrl = process.env.FRONTEND_URL || 'https://tenantflow.app'

		return await stripe.checkout.sessions.create(
			{
				mode: 'setup', // Payment method collection only
				customer: customerId,
				payment_method_types: ['card'],
				success_url: `${frontendUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${frontendUrl}/onboarding/payment`,
				metadata: {
					leaseId,
					subscriptionId,
					platform: 'tenantflow'
				}
			},
			{ stripeAccount: connectedAccountId }
		)
	}

	/**
	 * Link Stripe resource IDs to database records
	 */
	private async linkStripeResources(
		tenantId: string,
		leaseId: string,
		customerId: string,
		subscriptionId: string
	) {
		const client = this.supabase.getAdminClient()

		const results = await Promise.all([
			client
				.from('tenant')
				.update({ stripeCustomerId: customerId })
				.eq('id', tenantId),
			client
				.from('lease')
				.update({ stripeSubscriptionId: subscriptionId })
				.eq('id', leaseId)
		])

		for (const { error } of results) {
			if (error) {
				throw new BadRequestException(
					`Failed to link Stripe resources: ${error.message}`
				)
			}
		}
	}

	/**
	 * Send invitation email with Stripe Checkout URL
	 */
	private async sendInvitationEmail(
		tenant: Tenant,
		lease: Lease,
		checkoutUrl: string
	) {
		const client = this.supabase.getAdminClient()

		// Get property info for email
		const propertyId = lease.propertyId
		if (!propertyId) {
			throw new BadRequestException('Lease must have a property assigned')
		}

		const { data: property } = await client
			.from('property')
			.select('name')
			.eq('id', propertyId)
			.single()

		const frontendUrl = process.env.FRONTEND_URL || 'https://tenantflow.app'

		// Send Supabase Auth invitation with Checkout URL in metadata
		const { data: authUser, error } =
			await client.auth.admin.inviteUserByEmail(tenant.email, {
				data: {
					tenantId: tenant.id,
					leaseId: lease.id,
					propertyId: lease.propertyId,
					firstName: tenant.firstName,
					lastName: tenant.lastName,
					propertyName: property?.name || 'Your Property',
					checkoutUrl, // Tenant can complete payment setup
					role: 'tenant'
				},
				redirectTo: `${frontendUrl}/auth/confirm`
			})

		if (error) {
			throw new BadRequestException(
				`Failed to send invitation: ${error.message}`
			)
		}

		// Link auth user to tenant
		const { error: updateError } = await client
			.from('tenant')
			.update({
				auth_user_id: authUser.user?.id,
				invitation_status:
					'SENT' as Database['public']['Enums']['invitation_status'],
				invitation_sent_at: new Date().toISOString()
			})
			.eq('id', tenant.id)

		if (updateError) {
			throw new BadRequestException(
				`Failed to link auth user: ${updateError.message}`
			)
		}

		this.logger.log('Invitation email sent', {
			tenantId: tenant.id,
			authUserId: authUser.user?.id
		})
	}
}
