import {
	Controller,
	Get,
	Post,
	Delete,
	Body,
	Param,
	HttpCode,
	HttpStatus
} from '@nestjs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { SubscriptionStatusService } from './subscription-status.service'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import type { PlanType } from '@repo/database'
// Define subscription request type locally since it's not exported from shared
interface CreateSubscriptionRequest {
	planId: string;
	billingPeriod: string;
	userId?: string;
	userEmail?: string;
	userName?: string;
	createAccount?: boolean;
	paymentMethodCollection?: 'always' | 'if_required';
}

function isValidPlanType(planId: string): planId is PlanType {
	return ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'].includes(planId as PlanType)
}

@Controller('subscriptions')
export class SubscriptionsController {
	constructor(
		private readonly subscriptionsService: SubscriptionsManagerService,
		private readonly subscriptionStatusService: SubscriptionStatusService,
		private errorHandler: ErrorHandlerService
	) {}

	/**
	 * Get current user's subscription with usage metrics
	 */
	@Get('current')
	async getCurrentSubscription(@CurrentUser() user: { id: string }) {
		    return this.subscriptionsService.getUserSubscriptionWithPlan(user.id);
	}

	/**
	 * Get usage metrics for current user
	 */
	@Get('usage')
	async getUsageMetrics(@CurrentUser() user: { id: string }) {
		return this.subscriptionsService.calculateUsageMetrics(user.id)
	}

	/**
	 * Get subscription status and payment requirements
	 */
	@Get('status')
	async getSubscriptionStatus(@CurrentUser() user: { id: string }) {
		const [status, experience, paymentUrl] = await Promise.all([
			this.subscriptionStatusService.getUserSubscriptionStatus(user.id),
			this.subscriptionStatusService.getUserExperienceLevel(user.id),
			this.subscriptionStatusService.getPaymentActionUrl(user.id)
		])

		return {
			subscription: status,
			experience,
			paymentUrl,
			billingManagementAllowed: await this.subscriptionStatusService.canManageBilling(user.id)
		}
	}

	/**
	 * Check access to specific feature
	 */
	@Get('feature-access/:feature')
	async checkFeatureAccess(
		@CurrentUser() user: { id: string },
		@Param('feature') feature: string
	) {
		return this.subscriptionStatusService.checkFeatureAccess(user.id, feature)
	}

	/**
	 * Get all available plans
	 */
	@Get('plans')
	async getPlans() {
		return this.subscriptionsService.getAvailablePlans()
	}

	/**
	 * Get specific plan by ID
	 */
	@Get('plans/:planId')
	async getPlan(@Param('planId') planId: string) {
		if (!isValidPlanType(planId)) {
			throw this.errorHandler.createNotFoundError('Plan', planId)
		}
		const plan = await this.subscriptionsService.getPlanById(planId)
		if (!plan) {
			throw this.errorHandler.createNotFoundError('Plan', planId)
		}
		return plan
	}

	/**
	 * Create new subscription
	 * Note: This endpoint returns a message to use the checkout endpoint instead
	 */
	@Post()
	async createSubscription(
		@CurrentUser() user: { id: string },
		@Body() createSubscriptionDto: CreateSubscriptionRequest
	) {
		try {
			// Validate plan type
			if (!isValidPlanType(createSubscriptionDto.planId)) {
				throw this.errorHandler.createNotFoundError('Plan', createSubscriptionDto.planId)
			}

			// Delegate to subscriptions service for local subscription management
			const subscription = await this.subscriptionsService.getSubscription(user.id)
			if (subscription && ['ACTIVE', 'TRIALING'].includes(subscription.status)) {
				throw this.errorHandler.createBusinessError(
					ErrorCode.CONFLICT,
					'User already has an active subscription',
					{ metadata: { userId: user.id } }
				)
			}

			// This is a local subscription record update only
			// For Stripe checkout, use the checkout endpoint
			return {
				message: 'For new subscriptions, please use the checkout endpoint at /api/v1/subscriptions/create-checkout-session',
				currentSubscription: subscription
			}
		} catch (error) {
			return this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'SubscriptionsController.createSubscription',
				metadata: { userId: user.id }
			});
		}
	}

	/**
	 * Cancel current subscription
	 * Note: This endpoint returns a message to use the cancel endpoint instead
	 */
	@Delete('current')
	@HttpCode(HttpStatus.NO_CONTENT)
	async cancelSubscription(@CurrentUser() user: { id: string }) {
		try {
			const subscription = await this.subscriptionsService.getSubscription(user.id)
			if (!subscription || !['ACTIVE', 'TRIALING'].includes(subscription.status)) {
				throw this.errorHandler.createNotFoundError('Active subscription', user.id)
			}

			// For actual Stripe subscription cancellation, use the cancel endpoint
			return {
				message: 'For subscription cancellation, please use the endpoint at /api/v1/subscriptions/cancel',
				currentSubscription: subscription
			}
		} catch (error) {
			return this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'SubscriptionsController.cancelSubscription',
				metadata: { userId: user.id }
			});
		}
	}
}
