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
import type { Plan } from './subscriptions.service'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'

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
		const plan = await this.subscriptionsService.getPlanById(planId as any)
		if (!plan) {
			throw this.errorHandler.createNotFoundError('Plan', planId)
		}
		return plan
	}

	/**
	 * Create new subscription
	 */
	@Post()
	async createSubscription(
		@CurrentUser() user: { id: string },
		@Body() createSubscriptionDto: CreateSubscriptionDto
	) {
		const { planId, billingPeriod } = createSubscriptionDto
		const plan = await this.subscriptionsService.getPlanById(planId as any)
		if (!plan) {
			throw this.errorHandler.createNotFoundError('Plan', planId)
		}
		let stripePriceId: string | null = null
		if (billingPeriod === 'MONTHLY') {
			stripePriceId = plan.stripeMonthlyPriceId || null
		} else if (billingPeriod === 'ANNUAL') {
			stripePriceId = plan.stripeAnnualPriceId || null
		}
		if (!stripePriceId) {
			throw this.errorHandler.createBusinessError(
				ErrorCode.UNPROCESSABLE_ENTITY,
				'No Stripe price ID configured for this plan and billing period',
				{ operation: 'createSubscription', resource: 'subscription', metadata: { planId, billingPeriod } }
			)
		}
		return this.subscriptionsService.createSubscription(user.id, plan.id)
	}

	/**
	 * Cancel current subscription
	 */
	@Delete('current')
	@HttpCode(HttpStatus.NO_CONTENT)
	async cancelSubscription(@CurrentUser() user: { id: string }) {
		await this.subscriptionsService.cancelSubscription(user.id)
	}
}
