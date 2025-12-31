/**
 * Subscription Lifecycle Service
 * Handles pause, resume, and cancel subscription operations
 * Extracted from SubscriptionsService for SRP compliance
 */

import {
	BadRequestException,
	ForbiddenException,
	Injectable
} from '@nestjs/common'
import type { SubscriptionActionResponse } from '@repo/shared/types/api-contracts'
import type { Database } from '@repo/shared/types/supabase'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { SubscriptionCacheService } from './subscription-cache.service'
import { SubscriptionQueryService } from './subscription-query.service'
import { AppLogger } from '../logger/app-logger.service'

type LeaseRow = Database['public']['Tables']['leases']['Row']

@Injectable()
export class SubscriptionLifecycleService {
	private readonly stripe: Stripe

	constructor(
		private readonly supabase: SupabaseService,
		private readonly stripeClientService: StripeClientService,
		private readonly cache: SubscriptionCacheService,
		private readonly queryService: SubscriptionQueryService,
		private readonly logger: AppLogger
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Pause subscription
	 */
	async pauseSubscription(
		leaseId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		const leaseContext = await this.queryService.loadLeaseContext(leaseId)
		this.assertTenantUser(userId, leaseContext.tenantUser.id)
		this.ensureActiveSubscription(leaseContext.lease)

		const stripeSubscription = await this.stripe.subscriptions.update(
			leaseContext.lease.stripe_subscription_id!,
			{
				pause_collection: { behavior: 'keep_as_draft' }
			}
		)

		const { error } = await this.supabase
			.getAdminClient()
			.from('leases')
			.update({ auto_pay_enabled: false })
			.eq('id', leaseContext.lease.id)

		if (error) {
			this.logger.error('Failed to update lease pause flag', {
				leaseId,
				error: error.message
			})
			throw new BadRequestException('Failed to update subscription status')
		}

		leaseContext.lease.auto_pay_enabled = false

		// Invalidate lease cache
		await this.cache.invalidateLeaseCache(leaseContext.lease.id)

		return {
			success: true,
			subscription: await this.queryService.mapLeaseContextToResponse(
				leaseContext,
				{
					stripeSubscription
				}
			),
			message: 'Subscription paused successfully'
		}
	}

	/**
	 * Resume subscription
	 */
	async resumeSubscription(
		leaseId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		const leaseContext = await this.queryService.loadLeaseContext(leaseId)
		this.assertTenantUser(userId, leaseContext.tenantUser.id)
		this.ensureActiveSubscription(leaseContext.lease)

		const stripeSubscription = await this.stripe.subscriptions.update(
			leaseContext.lease.stripe_subscription_id!,
			{
				pause_collection: null
			}
		)

		const { error } = await this.supabase
			.getAdminClient()
			.from('leases')
			.update({ auto_pay_enabled: true })
			.eq('id', leaseContext.lease.id)

		if (error) {
			this.logger.error('Failed to update lease resume flag', {
				leaseId,
				error: error.message
			})
			throw new BadRequestException('Failed to update subscription status')
		}

		leaseContext.lease.auto_pay_enabled = true

		// Invalidate lease cache
		await this.cache.invalidateLeaseCache(leaseContext.lease.id)

		return {
			success: true,
			subscription: await this.queryService.mapLeaseContextToResponse(
				leaseContext,
				{
					stripeSubscription
				}
			),
			message: 'Subscription resumed successfully'
		}
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(
		leaseId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		const leaseContext = await this.queryService.loadLeaseContext(leaseId)
		this.assertTenantUser(userId, leaseContext.tenantUser.id)
		this.ensureActiveSubscription(leaseContext.lease)

		const stripeSubscription = await this.stripe.subscriptions.update(
			leaseContext.lease.stripe_subscription_id!,
			{ cancel_at_period_end: true }
		)

		const { error } = await this.supabase
			.getAdminClient()
			.from('leases')
			.update({
				auto_pay_enabled: false,
				stripe_subscription_id: null
			})
			.eq('id', leaseContext.lease.id)

		if (error) {
			this.logger.error('Failed to clear lease subscription id after cancel', {
				leaseId,
				error: error.message
			})
			throw new BadRequestException('Failed to update subscription status')
		}

		leaseContext.lease.auto_pay_enabled = false
		leaseContext.lease.stripe_subscription_id = null

		// Invalidate lease cache
		await this.cache.invalidateLeaseCache(leaseContext.lease.id)

		return {
			success: true,
			subscription: await this.queryService.mapLeaseContextToResponse(
				leaseContext,
				{
					stripeSubscription
				}
			),
			message: 'Subscription will be canceled at the end of the current period'
		}
	}

	// Private helper methods

	private assertTenantUser(
		requestingUserId: string,
		tenantUserId: string
	): void {
		if (requestingUserId !== tenantUserId) {
			throw new ForbiddenException(
				'You do not have access to this subscription'
			)
		}
	}

	private ensureActiveSubscription(lease: LeaseRow): void {
		if (!lease.stripe_subscription_id) {
			throw new BadRequestException('Autopay is not enabled for this lease')
		}
	}
}
