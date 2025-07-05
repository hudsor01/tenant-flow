import {
	Controller,
	Get,
	Post,
	Delete,
	Body,
	Param,
	UseGuards,
	HttpCode,
	HttpStatus
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { SubscriptionsService, PlanId } from './subscriptions.service'

interface CreateSubscriptionDto {
	planId: PlanId
	billingPeriod?: 'monthly' | 'annual'
}

interface CreatePortalSessionDto {
	returnUrl: string
}

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
	constructor(private readonly subscriptionsService: SubscriptionsService) {}

	/**
	 * Get current user's subscription with usage metrics
	 */
	@Get('current')
	async getCurrentSubscription(@CurrentUser() user: { id: string }) {
		return this.subscriptionsService.getUserSubscription(user.id)
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
		const { planId, billingPeriod = 'monthly' } = createSubscriptionDto

		return this.subscriptionsService.createSubscription(
			user.id,
			planId,
			billingPeriod
		)
	}

	/**
	 * Cancel current subscription
	 */
	@Delete('current')
	@HttpCode(HttpStatus.NO_CONTENT)
	async cancelSubscription(@CurrentUser() user: { id: string }) {
		await this.subscriptionsService.cancelSubscription(user.id)
	}

	/**
	 * Create customer portal session
	 */
	@Post('portal')
	async createPortalSession(
		@CurrentUser() user: { id: string },
		@Body() createPortalDto: CreatePortalSessionDto
	) {
		return this.subscriptionsService.createCustomerPortalSession(
			user.id,
			createPortalDto.returnUrl
		)
	}
}
