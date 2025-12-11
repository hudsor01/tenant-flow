/**
 * Subscription Webhook Handler
 *
 * Handles Stripe subscription lifecycle events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 */

import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import type { LeaseStatus } from '@repo/shared/types/core'

import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'

@Injectable()
export class SubscriptionWebhookHandler {

	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
		try {
			this.logger.log('Subscription created webhook received', {
				subscriptionId: subscription.id,
				status: subscription.status,
				metadata: subscription.metadata
			})

			const client = this.supabase.getAdminClient()

			// Get lease_id from subscription metadata (set during creation)
			const leaseId = subscription.metadata?.lease_id

			if (leaseId) {
				// Find lease by ID from metadata
				const { data: lease } = await client
					.from('leases')
					.select('id, stripe_subscription_status, stripe_subscription_id')
					.eq('id', leaseId)
					.single()

				if (lease) {
					// Only update if still pending (avoid overwriting active status)
					if (lease.stripe_subscription_status === 'pending') {
						await client
							.from('leases')
							.update({
								stripe_subscription_id: subscription.id,
								stripe_subscription_status: 'active',
								subscription_failure_reason: null,
								updated_at: new Date().toISOString()
							})
							.eq('id', lease.id)

						this.logger.log('Lease subscription confirmed via webhook', {
							leaseId: lease.id,
							subscriptionId: subscription.id
						})
					} else {
						this.logger.debug('Lease subscription already active, skipping update', {
							leaseId: lease.id,
							currentStatus: lease.stripe_subscription_status
						})
					}
				} else {
					this.logger.warn('Lease not found for subscription metadata', {
						leaseId,
						subscriptionId: subscription.id
					})
				}
			} else {
				// Fallback: Find by subscription ID (for edge cases)
				const { data: lease } = await client
					.from('leases')
					.select('id, stripe_subscription_status')
					.eq('stripe_subscription_id', subscription.id)
					.maybeSingle()

				if (lease && lease.stripe_subscription_status === 'pending') {
					await client
						.from('leases')
						.update({
							stripe_subscription_status: 'active',
							subscription_failure_reason: null,
							updated_at: new Date().toISOString()
						})
						.eq('id', lease.id)

					this.logger.log('Lease subscription status confirmed via webhook (fallback)', {
						leaseId: lease.id,
						subscriptionId: subscription.id
					})
				}
			}
		} catch (error) {
			this.logger.error('Failed to handle subscription created', {
				error: error instanceof Error ? error.message : String(error),
				subscriptionId: subscription.id
			})
			throw error
		}
	}

	async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
		try {
			this.logger.log('Subscription updated', {
				subscriptionId: subscription.id,
				status: subscription.status
			})

			const client = this.supabase.getAdminClient()

			const { data: lease } = await client
				.from('leases')
				.select('id')
				.eq('stripe_subscription_id', subscription.id)
				.single()

			if (!lease) {
				this.logger.warn('Lease not found for subscription', {
					subscriptionId: subscription.id
				})
				return
			}

			let lease_status: LeaseStatus = 'draft'

			if (subscription.status === 'active') {
				lease_status = 'active'
			} else if (subscription.status === 'canceled') {
				lease_status = 'terminated'
			}

			await client
				.from('leases')
				.update({
					lease_status: lease_status,
					updated_at: new Date().toISOString()
				})
				.eq('id', lease.id)

			this.logger.log('Lease status updated', {
				lease_id: lease.id,
				status: lease_status
			})
		} catch (error) {
			this.logger.error('Failed to handle subscription updated', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
		try {
			this.logger.log('Subscription deleted', {
				subscriptionId: subscription.id
			})

			const client = this.supabase.getAdminClient()

			const { data: lease } = await client
				.from('leases')
				.select('id')
				.eq('stripe_subscription_id', subscription.id)
				.single()

			if (!lease) {
				this.logger.warn('Lease not found for deleted subscription', {
					subscriptionId: subscription.id
				})
				return
			}

			await client
				.from('leases')
				.update({
					lease_status: 'terminated',
					updated_at: new Date().toISOString()
				})
				.eq('id', lease.id)

			this.logger.log('Lease terminated due to subscription deletion', {
				lease_id: lease.id
			})
		} catch (error) {
			this.logger.error('Failed to handle subscription deletion', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}
}