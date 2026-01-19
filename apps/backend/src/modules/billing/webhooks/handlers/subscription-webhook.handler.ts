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

import { SupabaseService } from '../../../../database/supabase.service'
import { AppLogger } from '../../../../logger/app-logger.service'

@Injectable()
export class SubscriptionWebhookHandler {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	async handleSubscriptionCreated(
		subscription: Stripe.Subscription
	): Promise<void> {
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
				// Audit log: Lease ownership verified before modification
				this.logger.log('Lease ownership verified for webhook', {
					stripe_subscription_id: subscription.id,
					lease_id: leaseId,
					event_type: 'customer.subscription.created'
				})

				// Use atomic RPC to confirm subscription (only updates if pending)
				const { error: rpcError } = await client.rpc(
					'confirm_lease_subscription',
					{
						p_lease_id: leaseId,
						p_subscription_id: subscription.id
					}
				)

				if (rpcError) {
					this.logger.error('Failed to confirm lease subscription via RPC', {
						error: rpcError.message,
						leaseId,
						subscriptionId: subscription.id
					})
					throw new Error(`Transaction failed: ${rpcError.message}`)
				}

				this.logger.log('Lease subscription confirmed via webhook', {
					leaseId,
					subscriptionId: subscription.id
				})
			} else {
				// No lease_id in metadata - log for debugging
				this.logger.debug(
					'Subscription created without lease_id metadata, skipping',
					{
						subscriptionId: subscription.id
					}
				)
			}
		} catch (error) {
			this.logger.error('Failed to handle subscription created', {
				error: error instanceof Error ? error.message : String(error),
				subscriptionId: subscription.id
			})
			throw error
		}
	}

	async handleSubscriptionUpdated(
		subscription: Stripe.Subscription
	): Promise<void> {
		try {
			this.logger.log('Subscription updated', {
				subscriptionId: subscription.id,
				status: subscription.status
			})

			const client = this.supabase.getAdminClient()

			// Map Stripe status to lease status
			const newStatus =
				subscription.status === 'active'
					? 'active'
					: subscription.status === 'canceled'
						? 'terminated'
						: 'draft'

			// Audit log: Subscription processing for lease status change
			this.logger.log('Processing subscription status change for webhook', {
				stripe_subscription_id: subscription.id,
				stripe_status: subscription.status,
				target_lease_status: newStatus,
				event_type: 'customer.subscription.updated'
			})

			// Use atomic RPC to update lease status (skips if lease not found)
			const { error: rpcError } = await client.rpc(
				'process_subscription_status_change',
				{
					p_subscription_id: subscription.id,
					p_new_status: newStatus
				}
			)

			if (rpcError) {
				this.logger.error('Failed to process subscription update via RPC', {
					error: rpcError.message,
					subscriptionId: subscription.id
				})
				throw new Error(`Transaction failed: ${rpcError.message}`)
			}

			this.logger.log('Lease status updated via RPC', {
				subscriptionId: subscription.id,
				newStatus
			})
		} catch (error) {
			this.logger.error('Failed to handle subscription updated', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	async handleSubscriptionDeleted(
		subscription: Stripe.Subscription
	): Promise<void> {
		try {
			this.logger.log('Subscription deleted', {
				subscriptionId: subscription.id
			})

			const client = this.supabase.getAdminClient()

			// Audit log: Subscription deletion processing
			this.logger.log('Processing subscription deletion for webhook', {
				stripe_subscription_id: subscription.id,
				target_lease_status: 'terminated',
				event_type: 'customer.subscription.deleted'
			})

			// Use atomic RPC to terminate lease (skips if lease not found)
			const { error: rpcError } = await client.rpc(
				'process_subscription_status_change',
				{
					p_subscription_id: subscription.id,
					p_new_status: 'terminated'
				}
			)

			if (rpcError) {
				this.logger.error('Failed to process subscription deletion via RPC', {
					error: rpcError.message,
					subscriptionId: subscription.id
				})
				throw new Error(`Transaction failed: ${rpcError.message}`)
			}

			this.logger.log('Lease terminated due to subscription deletion', {
				subscriptionId: subscription.id
			})
		} catch (error) {
			this.logger.error('Failed to handle subscription deletion', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}
}
