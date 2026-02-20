/**
 * Subscriptions Controller
 * Phase 4: Autopay Subscriptions
 *
 * REST API endpoints for managing rent subscriptions
 */

import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Request,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	SubscriptionActionResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/api-contracts'
import { SubscriptionsService } from './subscriptions.service'
import type { AuthenticatedRequest } from '../shared/types/express-request.types'

@ApiTags('Subscriptions')
@ApiBearerAuth('supabase-auth')
@Controller('subscriptions')
export class SubscriptionsController {
	constructor(private readonly subscriptionsService: SubscriptionsService) {}

	/**
	 * Create a new rent subscription
	 * POST /subscriptions
	 */
	@ApiOperation({ summary: 'Create subscription', description: 'Create a new rent subscription for autopay' })
	@ApiBody({ description: 'Subscription creation request' })
	@ApiResponse({ status: 201, description: 'Subscription created successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post()
	async createSubscription(
		@Request() req: AuthenticatedRequest,
		@Body() request: CreateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException()
		}

		return this.subscriptionsService.createSubscription(user_id, request)
	}

	/**
	 * List all subscriptions for current user
	 * GET /api/v1/subscriptions
	 */
	@ApiOperation({ summary: 'List subscriptions', description: 'List all rent subscriptions for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get()
	async listSubscriptions(
		@Request() req: AuthenticatedRequest
	): Promise<{ subscriptions: RentSubscriptionResponse[] }> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException()
		}

		const subscriptions =
			await this.subscriptionsService.listSubscriptions(user_id)
		return { subscriptions }
	}

	/**
	 * Get subscription by ID
	 * GET /api/v1/subscriptions/:id
	 */
	@ApiOperation({ summary: 'Get subscription', description: 'Get a subscription by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Subscription UUID' })
	@ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Subscription not found' })
	@Get(':id')
	async getSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<RentSubscriptionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException()
		}

		return this.subscriptionsService.getSubscription(id, user_id)
	}

	/**
	 * Update subscription
	 * PATCH /api/v1/subscriptions/:id
	 */
	@ApiOperation({ summary: 'Update subscription', description: 'Update a subscription by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Subscription UUID' })
	@ApiBody({ description: 'Subscription update request' })
	@ApiResponse({ status: 200, description: 'Subscription updated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Subscription not found' })
	@Patch(':id')
	async updateSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() update: UpdateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException()
		}

		return this.subscriptionsService.updateSubscription(id, user_id, update)
	}

	/**
	 * Pause subscription
	 * POST /api/v1/subscriptions/:id/pause
	 */
	@ApiOperation({ summary: 'Pause subscription', description: 'Pause a subscription by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Subscription UUID' })
	@ApiResponse({ status: 200, description: 'Subscription paused successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Subscription not found' })
	@Post(':id/pause')
	async pauseSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<SubscriptionActionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException()
		}

		return this.subscriptionsService.pauseSubscription(id, user_id)
	}

	/**
	 * Resume subscription
	 * POST /api/v1/subscriptions/:id/resume
	 */
	@ApiOperation({ summary: 'Resume subscription', description: 'Resume a paused subscription by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Subscription UUID' })
	@ApiResponse({ status: 200, description: 'Subscription resumed successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Subscription not found' })
	@Post(':id/resume')
	async resumeSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<SubscriptionActionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException()
		}

		return this.subscriptionsService.resumeSubscription(id, user_id)
	}

	/**
	 * Cancel subscription
	 * POST /api/v1/subscriptions/:id/cancel
	 */
	@ApiOperation({ summary: 'Cancel subscription', description: 'Cancel a subscription by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Subscription UUID' })
	@ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Subscription not found' })
	@Post(':id/cancel')
	async cancelSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<SubscriptionActionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new UnauthorizedException()
		}

		return this.subscriptionsService.cancelSubscription(id, user_id)
	}
}
