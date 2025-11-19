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
	Request
} from '@nestjs/common'
import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	SubscriptionActionResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/api-contracts'
import type { Request as ExpressRequest } from 'express'
import { SubscriptionsService } from './subscriptions.service'

interface AuthenticatedRequest extends ExpressRequest {
	user?: {
		id: string
	}
}

@Controller('subscriptions')
export class SubscriptionsController {
	constructor(private readonly subscriptionsService: SubscriptionsService) {}

	/**
	 * Create a new rent subscription
	 * POST /subscriptions
	 */
	@Post()
		async createSubscription(
			@Request() req: AuthenticatedRequest,
			@Body() request: CreateSubscriptionRequest
		): Promise<RentSubscriptionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.createSubscription(user_id, request)
	}

	/**
	 * List all subscriptions for current user
	 * GET /api/v1/subscriptions
	 */
	@Get()
	async listSubscriptions(
		@Request() req: AuthenticatedRequest
	): Promise<{ subscriptions: RentSubscriptionResponse[] }> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new Error('User not authenticated')
		}

		const subscriptions =
			await this.subscriptionsService.listSubscriptions(user_id)
		return { subscriptions }
	}

	/**
	 * Get subscription by ID
	 * GET /api/v1/subscriptions/:id
	 */
	@Get(':id')
	async getSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<RentSubscriptionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.getSubscription(id, user_id)
	}

	/**
	 * Update subscription
	 * PATCH /api/v1/subscriptions/:id
	 */
	@Patch(':id')
	async updateSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() update: UpdateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.updateSubscription(id, user_id, update)
	}

	/**
	 * Pause subscription
	 * POST /api/v1/subscriptions/:id/pause
	 */
	@Post(':id/pause')
	async pauseSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<SubscriptionActionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.pauseSubscription(id, user_id)
	}

	/**
	 * Resume subscription
	 * POST /api/v1/subscriptions/:id/resume
	 */
	@Post(':id/resume')
	async resumeSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<SubscriptionActionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.resumeSubscription(id, user_id)
	}

	/**
	 * Cancel subscription
	 * POST /api/v1/subscriptions/:id/cancel
	 */
	@Post(':id/cancel')
	async cancelSubscription(
		@Request() req: AuthenticatedRequest,
		@Param('id', ParseUUIDPipe) id: string
	): Promise<SubscriptionActionResponse> {
		const user_id = req.user?.id
		if (!user_id) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.cancelSubscription(id, user_id)
	}
}
