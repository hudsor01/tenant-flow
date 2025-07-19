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
import type { PlanId } from './subscriptions.service'

interface CreateSubscriptionDto {
	planId: PlanId
	billingPeriod: 'MONTHLY' | 'ANNUAL'
}

@Controller('subscriptions')
export class SubscriptionsController {
	constructor(private readonly subscriptionsService: SubscriptionsService) {}

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
		const plan = this.subscriptionsService.getPlanById(planId)
		if (!plan) {
			throw new Error('Plan not found')
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
		const plan = this.subscriptionsService.getPlanById(planId)
		if (!plan) {
			throw new Error('Plan not found')
		}
		let stripePriceId: string | null = null
		if (billingPeriod === 'MONTHLY') {
			stripePriceId = plan.stripeMonthlyPriceId
		} else if (billingPeriod === 'ANNUAL') {
			stripePriceId = plan.stripeAnnualPriceId
		}
		if (!stripePriceId) {
			throw new Error(
				'No Stripe price ID configured for this plan and billing period'
			)
		}
		return this.subscriptionsService.createSubscription({
			userId: user.id,
			stripePriceId,
			paymentMethodCollection: 'always'
		})
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
