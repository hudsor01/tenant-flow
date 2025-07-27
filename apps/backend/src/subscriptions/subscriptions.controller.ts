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
import { SubscriptionsService } from './subscriptions.service'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import type { PlanType } from '@prisma/client'

function isValidPlanType(planId: string): planId is PlanType {
	return ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'].includes(planId as PlanType)
}

interface CreateSubscriptionDto {
	planId: string
	billingPeriod: 'MONTHLY' | 'ANNUAL'
}

@Controller('subscriptions')
export class SubscriptionsController {
	constructor(
		private readonly subscriptionsService: SubscriptionsService,
		private errorHandler: ErrorHandlerService
	) {}

	/**
	 * Get current user's subscription with usage metrics
	 */
	@Get('current')
	async getCurrentSubscription(@CurrentUser() user: { id: string }) {
		return this.subscriptionsService.getUserSubscriptionWithPlan(user.id)
	}

	/**
	 * Get usage metrics for current user
	 */
	@Get('usage')
	async getUsageMetrics(@CurrentUser() user: { id: string }) {
		return this.subscriptionsService.calculateUsageMetrics(user.id)
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
	 * @deprecated Use Hono RPC endpoint /api/hono/api/v1/subscriptions/checkout instead
	 */
	@Post()
	async createSubscription(
		@CurrentUser() user: { id: string },
		@Body() createSubscriptionDto: CreateSubscriptionDto
	) {
		return this.errorHandler.handleAsync(async () => {
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
					{ userId: user.id, currentPlan: subscription.planType }
				)
			}

			// This is a local subscription record update only
			// For Stripe checkout, use the Hono RPC /api/hono/api/v1/subscriptions/checkout endpoint
			return {
				message: 'For new subscriptions, please use the Hono RPC checkout endpoint at /api/hono/api/v1/subscriptions/checkout',
				currentSubscription: subscription
			}
		}, {
			operation: 'SubscriptionsController.createSubscription',
			context: { userId: user.id, planId: createSubscriptionDto.planId }
		})
	}

	/**
	 * Cancel current subscription  
	 * @deprecated Use Hono RPC endpoint /api/hono/api/v1/subscriptions/cancel instead
	 */
	@Delete('current')
	@HttpCode(HttpStatus.NO_CONTENT)
	async cancelSubscription(@CurrentUser() user: { id: string }) {
		return this.errorHandler.handleAsync(async () => {
			const subscription = await this.subscriptionsService.getSubscription(user.id)
			if (!subscription || !['ACTIVE', 'TRIALING'].includes(subscription.status)) {
				throw this.errorHandler.createNotFoundError('Active subscription', user.id)
			}

			// For actual Stripe subscription cancellation, use the Hono RPC endpoint
			return {
				message: 'For subscription cancellation, please use the Hono RPC endpoint at /api/hono/api/v1/subscriptions/cancel',
				currentSubscription: subscription
			}
		}, {
			operation: 'SubscriptionsController.cancelSubscription',
			context: { userId: user.id }
		})
	}
}
