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
