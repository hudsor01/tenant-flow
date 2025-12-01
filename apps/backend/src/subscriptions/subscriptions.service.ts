/**
 * Subscriptions Service (Facade)
 * Phase 4: Autopay Subscriptions
 *
 * Facade pattern: Delegates to specialized services while maintaining
 * backwards-compatible API for the controller.
 *
 * Decomposed Services:
 * - SubscriptionQueryService: Read operations (getSubscription, listSubscriptions)
 * - SubscriptionBillingService: Create and update operations
 * - SubscriptionLifecycleService: Pause, resume, cancel operations
 */

import { Injectable } from '@nestjs/common'
import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	SubscriptionActionResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/api-contracts'
import { SubscriptionQueryService } from './subscription-query.service'
import { SubscriptionBillingService } from './subscription-billing.service'
import { SubscriptionLifecycleService } from './subscription-lifecycle.service'

@Injectable()
export class SubscriptionsService {
	constructor(
		private readonly queryService: SubscriptionQueryService,
		private readonly billingService: SubscriptionBillingService,
		private readonly lifecycleService: SubscriptionLifecycleService
	) {}

	/**
	 * Create a new rent subscription (one per lease)
	 */
	async createSubscription(
		userId: string,
		request: CreateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		return this.billingService.createSubscription(userId, request)
	}

	/**
	 * Get subscription by lease id
	 */
	async getSubscription(
		leaseId: string,
		userId: string
	): Promise<RentSubscriptionResponse> {
		return this.queryService.getSubscription(leaseId, userId)
	}

	/**
	 * List subscriptions for current user (tenant or owner context)
	 */
	async listSubscriptions(userId: string): Promise<RentSubscriptionResponse[]> {
		return this.queryService.listSubscriptions(userId)
	}

	/**
	 * Pause subscription
	 */
	async pauseSubscription(
		leaseId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		return this.lifecycleService.pauseSubscription(leaseId, userId)
	}

	/**
	 * Resume subscription
	 */
	async resumeSubscription(
		leaseId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		return this.lifecycleService.resumeSubscription(leaseId, userId)
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(
		leaseId: string,
		userId: string
	): Promise<SubscriptionActionResponse> {
		return this.lifecycleService.cancelSubscription(leaseId, userId)
	}

	/**
	 * Update subscription amount / payment method / billing day
	 */
	async updateSubscription(
		leaseId: string,
		userId: string,
		update: UpdateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		return this.billingService.updateSubscription(leaseId, userId, update)
	}
}
