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
import { z } from 'zod'
import type { Tenant, Lease } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { AppConfigService } from '../../config/app-config.service'
import { SupabaseService } from '../../database/supabase.service'
import { StripeConnectService } from '../billing/stripe-connect.service'

// Zod schemas for runtime validation
// Note: RPC returns subset of full Tenant/Lease types - validate essential fields only
const TenantLeaseRpcResultSchema = z.object({
	tenant: z.object({
		id: z.string().uuid(),
		email: z.string().email(),
		firstName: z.string(),
		lastName: z.string(),
		phone: z.string().nullable(),
		status: z.string()
	}).passthrough(), // Allow additional fields from RPC
	lease: z.object({
		id: z.string().uuid(),
		propertyId: z.string().uuid(),
		unitId: z.string().uuid().nullable(),
		tenantId: z.string().uuid(),
		startDate: z.string(),
		endDate: z.string(),
		rentAmount: z.number(),
		securityDeposit: z.number(),
		status: z.string()
	}).passthrough() // Allow additional fields from RPC
})

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

export interface TenantInvitationResult {
	success: boolean
	tenantId: string
	leaseId: string
	checkoutUrl: string
	message: string
}

@Injectable()
export class TenantInvitationService {
	private readonly logger = new Logger(TenantInvitationService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeConnect: StripeConnectService,
		private readonly eventEmitter: EventEmitter2,
		private readonly config: AppConfigService
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
				message: 'Tenant created and invitation sent with payment setup link'
			}
		} catch (error) {
			// Log error without PII (no tenant email, name, phone)
			this.logger.error('Tenant invitation failed', {
				ownerId,
				propertyId: input.propertyId,
				unitId: input.unitId,
				rentAmount: input.rentAmount,
				error: error instanceof Error ? error.message : String(error)
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
		// Validate rent amount before RPC call (defense in depth)
		if (!input.rentAmount || input.rentAmount <= 0) {
			throw new BadRequestException('Rent amount must be greater than zero')
		}

		// Validate security deposit is non-negative
		if (input.securityDeposit !== undefined && input.securityDeposit < 0) {
			throw new BadRequestException('Security deposit cannot be negative')
		}

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
			this.logger.error('Failed to create tenant via RPC', {
				ownerId,
				error: error?.message
			})
			throw new BadRequestException(
				'Failed to create tenant. Please verify the property and tenant details.'
			)
		}

		// Validate JSON result with Zod for runtime type safety
		const validationResult = TenantLeaseRpcResultSchema.safeParse(data)
		if (!validationResult.success) {
			this.logger.error('RPC result validation failed', {
				errorCount: validationResult.error.issues.length,
				firstIssue: validationResult.error.issues[0]?.path.join('.')
			})
			throw new BadRequestException('Invalid RPC response structure')
		}

		// Cast to full Tenant/Lease types (RPC returns all fields, we only validate essential ones)
		return validationResult.data as unknown as { tenant: Tenant; lease: Lease }
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
						// Stripe SDK types are overly strict - API accepts inline product_data
						// but TypeScript types expect product ID string. This is a known issue.
						// References:
						// - API docs: https://stripe.com/docs/api/subscriptions/create#create_subscription-items-price_data
						// - SDK issue: https://github.com/stripe/stripe-node/issues/1179
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
		const frontendUrl = this.config.getFrontendUrl()

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
				this.logger.error('Failed to link Stripe resources', {
					tenantId,
					leaseId,
					error: error.message
				})
				throw new BadRequestException(
					'Failed to link Stripe subscription. Please contact support.'
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
		const frontendUrl = this.config.getFrontendUrl()

		// Get property name for email metadata
		// Note: PropertyOwnershipGuard already validated property exists and is owned by user
		const propertyId = lease.propertyId
		if (!propertyId) {
			throw new BadRequestException('Lease must have a property assigned')
		}

		const { data: property } = await client
			.from('property')
			.select('name')
			.eq('id', propertyId)
			.single()

		// Send Supabase Auth invitation with Checkout URL in metadata
		const { data: authUser, error } = await client.auth.admin.inviteUserByEmail(
			tenant.email,
			{
				data: {
					tenantId: tenant.id,
					leaseId: lease.id,
					propertyId: lease.propertyId,
					firstName: tenant.firstName,
					lastName: tenant.lastName,
					propertyName: property?.name ?? 'Property',
					checkoutUrl, // Tenant can complete payment setup
					role: 'tenant'
				},
				redirectTo: `${frontendUrl}/auth/confirm`
			}
		)

		if (error) {
			throw new BadRequestException(
				`Failed to send invitation: ${error.message}`
			)
		}

		// Validate auth user response before linking
		if (!authUser.user?.id) {
			this.logger.error('Auth invitation succeeded but user ID is missing', {
				tenantId: tenant.id
			})
			throw new BadRequestException(
				'Failed to create auth user: User ID missing from response'
			)
		}

		const authUserId = authUser.user.id

		// Link auth user to tenant
		const { error: updateError } = await client
			.from('tenant')
			.update({
				auth_user_id: authUserId,
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
			authUserId
		})
	}
}
