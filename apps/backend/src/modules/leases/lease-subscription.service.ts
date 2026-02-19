/**
 * LeaseSubscriptionService
 *
 * Handles Stripe subscription creation for activated leases.
 * Extracted from LeaseSignatureService to follow SRP.
 *
 * Responsibilities:
 * - Create Stripe customer on connected account
 * - Create Stripe subscription for rent payments
 * - Handle subscription failures with retry tracking
 * - Emit subscription lifecycle events
 */

import { BadRequestException, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { SupabaseService } from '../../database/supabase.service'
import { ConnectService } from '../billing/connect/connect.service'
import {
	LEASE_SIGNATURE_ERROR_MESSAGES,
	LEASE_SIGNATURE_ERROR_CODES
} from '@repo/shared/constants/lease-signature-errors'
import { AppLogger } from '../../logger/app-logger.service'

interface LeaseForSubscription {
	id: string
	primary_tenant_id: string
	rent_amount: number
}

interface LeaseForActivation {
	id: string
	owner_user_id: string | null
	primary_tenant_id: string
	rent_amount: number
}

interface SignatureData {
	owner_signed_at?: string
	owner_signature_ip?: string
	owner_signature_method?: 'in_app' | 'docuseal'
	tenant_signed_at?: string
	tenant_signature_ip?: string
	tenant_signature_method?: 'in_app' | 'docuseal'
}

@Injectable()
export class LeaseSubscriptionService {
	constructor(
		private readonly eventEmitter: EventEmitter2,
		private readonly connectService: ConnectService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Activate a fully-signed lease and create Stripe subscription
	 * Called when both owner and tenant have signed
	 */
	async activateLease(
		client: ReturnType<SupabaseService['getAdminClient']>,
		lease: LeaseForActivation,
		_signatureData: SignatureData
	): Promise<void> {
		this.logger.log('Activating lease - both parties have signed', {
			leaseId: lease.id
		})

		if (!lease.owner_user_id) {
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.LEASE_NEEDS_OWNER_TO_ACTIVATE
				]
			)
		}

		// Step 1: Get property owner's Stripe account
		const { data: owner, error: ownerError } = await client
			.from('stripe_connected_accounts')
			.select('id, stripe_account_id, charges_enabled, payouts_enabled')
			.eq('user_id', lease.owner_user_id)
			.single()

		if (ownerError || !owner || !owner.stripe_account_id) {
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.STRIPE_CONNECT_NOT_SETUP
				]
			)
		}

		// Verify charges are enabled on the Stripe account
		if (!owner.charges_enabled) {
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.STRIPE_VERIFICATION_INCOMPLETE
				]
			)
		}

		// Step 2: Atomically activate lease with pending subscription status
		const { data: activationResult, error: activationError } = await client.rpc(
			'activate_lease_with_pending_subscription',
			{ p_lease_id: lease.id }
		)

		if (activationError) {
			this.logger.error('RPC activate_lease_with_pending_subscription failed', {
				leaseId: lease.id,
				error: activationError
			})
			throw new BadRequestException(
				LEASE_SIGNATURE_ERROR_MESSAGES[
					LEASE_SIGNATURE_ERROR_CODES.ACTIVATE_LEASE_FAILED
				]
			)
		}

		// Parse RPC result (returns SETOF)
		const result = Array.isArray(activationResult)
			? activationResult[0]
			: activationResult
		if (!result?.success) {
			throw new BadRequestException(
				result?.error_message ||
					LEASE_SIGNATURE_ERROR_MESSAGES[
						LEASE_SIGNATURE_ERROR_CODES.ACTIVATE_LEASE_FAILED
					]
			)
		}

		// Step 3: Emit lease.activated event (lease is active, subscription pending)
		this.eventEmitter.emit('lease.activated', {
			lease_id: lease.id,
			tenant_id: lease.primary_tenant_id,
			subscription_id: null, // Pending
			subscription_status: 'pending'
		})

		this.logger.log('Lease activated with pending subscription', {
			leaseId: lease.id
		})

		// Step 4: Create Stripe subscription (deferred, with retry capability)
		await this.createSubscriptionForLease(
			client,
			lease,
			owner.stripe_account_id
		)
	}

	/**
	 * Create Stripe subscription for an activated lease
	 * Handles customer creation on connected account if needed
	 */
	async createSubscriptionForLease(
		client: ReturnType<SupabaseService['getAdminClient']>,
		lease: LeaseForSubscription,
		connectedAccountId: string
	): Promise<void> {
		// Get tenant with stripe customer ID
		const { data: tenant, error: tenantError } = await client
			.from('tenants')
			.select('id, user_id, stripe_customer_id')
			.eq('id', lease.primary_tenant_id)
			.single()

		if (tenantError || !tenant) {
			await this.markSubscriptionFailed(client, lease.id, 'Tenant not found')
			return
		}

		// Get user info for email (needed if creating new customer)
		const { data: user } = await client
			.from('users')
			.select('email, first_name, last_name, phone')
			.eq('id', tenant.user_id)
			.single()

		let stripeCustomerId = tenant.stripe_customer_id

		// Create Stripe customer on connected account if needed
		if (!stripeCustomerId) {
			try {
				if (!user?.email) {
					await this.markSubscriptionFailed(
						client,
						lease.id,
						`Tenant ${tenant.id} has no email address. Cannot create Stripe customer.`
					)
					return
				}

				const customerName = user
					? `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
						undefined
					: undefined

				const createCustomerParams: {
					email: string
					name?: string
					phone?: string
					metadata?: Record<string, string>
				} = {
					email: user.email,
					metadata: {
						tenant_id: tenant.id,
						user_id: tenant.user_id
					}
				}
				if (customerName) {
					createCustomerParams.name = customerName
				}
				if (user?.phone) {
					createCustomerParams.phone = user.phone
				}

				const customer =
					await this.connectService.createCustomerOnConnectedAccount(
						connectedAccountId,
						createCustomerParams
					)
				stripeCustomerId = customer.id

				// Update tenant with Stripe customer ID
				await client
					.from('tenants')
					.update({ stripe_customer_id: stripeCustomerId })
					.eq('id', tenant.id)
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Failed to create Stripe customer'
				await this.markSubscriptionFailed(client, lease.id, errorMessage)
				return
			}
		}

		// Create Stripe subscription with idempotency key for safe retries
		try {
			const subscription =
				await this.connectService.createSubscriptionOnConnectedAccount(
					connectedAccountId,
					{
						customerId: stripeCustomerId,
						rentAmount: lease.rent_amount,
						idempotencyKey: `lease-activation-${lease.id}`,
						metadata: {
							lease_id: lease.id,
							tenant_id: lease.primary_tenant_id
						}
					}
				)

			// Success: Update subscription status to active
			const { error: updateError } = await client
				.from('leases')
				.update({
					stripe_subscription_id: subscription.id,
					stripe_subscription_status: 'active',
					subscription_failure_reason: null,
					subscription_retry_count: 0,
					updated_at: new Date().toISOString()
				})
				.eq('id', lease.id)

			if (updateError) {
				this.logger.error('Failed to update lease with subscription ID', {
					leaseId: lease.id,
					subscriptionId: subscription.id,
					error: updateError.message
				})
				// Don't throw - subscription was created successfully, just log the error
				// Webhook will also confirm the subscription
			}

			// Emit subscription success event
			this.eventEmitter.emit('lease.subscription_created', {
				lease_id: lease.id,
				tenant_id: lease.primary_tenant_id,
				subscription_id: subscription.id
			})

			this.logger.log('Lease subscription created successfully', {
				leaseId: lease.id,
				subscriptionId: subscription.id
			})
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown Stripe error'
			await this.markSubscriptionFailed(client, lease.id, errorMessage)

			// Emit failure event for alerting
			this.eventEmitter.emit('lease.subscription_failed', {
				lease_id: lease.id,
				tenant_id: lease.primary_tenant_id,
				error: errorMessage
			})
		}
	}

	/**
	 * Mark subscription as failed with retry tracking
	 */
	async markSubscriptionFailed(
		client: ReturnType<SupabaseService['getAdminClient']>,
		leaseId: string,
		errorMessage: string
	): Promise<void> {
		this.logger.error('Stripe subscription creation failed', {
			leaseId,
			error: errorMessage
		})

		// Get current retry count
		const { data: lease } = await client
			.from('leases')
			.select('subscription_retry_count')
			.eq('id', leaseId)
			.single()

		const currentRetryCount = lease?.subscription_retry_count ?? 0

		await client
			.from('leases')
			.update({
				stripe_subscription_status: 'failed',
				subscription_failure_reason: errorMessage,
				subscription_retry_count: currentRetryCount + 1,
				subscription_last_attempt_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('id', leaseId)
	}
}
