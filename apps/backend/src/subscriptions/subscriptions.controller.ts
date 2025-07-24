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
	 * @deprecated Use TRPC endpoint subscriptions.createDirect instead
	 */
	@Post()
	async createSubscription(
		@CurrentUser() _user: { id: string },
		@Body() _createSubscriptionDto: CreateSubscriptionDto
	) {
		// This endpoint is deprecated in favor of TRPC
		throw this.errorHandler.createBusinessError(
			ErrorCode.UNPROCESSABLE_ENTITY,
			'This endpoint is deprecated. Please use the TRPC API at /api/trpc',
			{ operation: 'createSubscription', resource: 'subscription' }
		)
	}

	/**
	 * Cancel current subscription
	 * @deprecated Use TRPC endpoint subscriptions.cancel instead
	 */
	@Delete('current')
	@HttpCode(HttpStatus.NO_CONTENT)
	async cancelSubscription(@CurrentUser() _user: { id: string }) {
		// This endpoint is deprecated in favor of TRPC
		throw this.errorHandler.createBusinessError(
			ErrorCode.UNPROCESSABLE_ENTITY,
			'This endpoint is deprecated. Please use the TRPC API at /api/trpc',
			{ operation: 'cancelSubscription', resource: 'subscription' }
		)
	}
}
