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
} from '@repo/shared/types/core'
import type { Request as ExpressRequest } from 'express'
import { SubscriptionsService } from './subscriptions.service'

interface AuthenticatedRequest extends ExpressRequest {
	user?: {
		id: string
	}
}

@Controller('api/v1/subscriptions')
export class SubscriptionsController {
	/**
	 * NOTE: Authentication guard missing on this controller
	 * - All subscription handlers rely on `req.user` but the controller
	 *   does not apply `JwtAuthGuard` (e.g. via `@UseGuards(JwtAuthGuard)`)
	 *   or otherwise ensure the request is authenticated. Without the guard
	 *   `req.user` will not be populated and handlers will throw a generic
	 *   Error('User not authenticated') resulting in 500 responses instead
	 *   of proper 401/403 responses.
	 * - Recommendation: add `@UseGuards(JwtAuthGuard)` at the controller
	 *   or route level and replace the generic Error with
	 *   `throw new UnauthorizedException()` when `req.user` is missing.
	 */
	constructor(private readonly subscriptionsService: SubscriptionsService) {}

	/**
	 * Create a new rent subscription
	 * POST /api/v1/subscriptions
	 */
	@Post()
	async createSubscription(
		@Request() req: AuthenticatedRequest,
		@Body() request: CreateSubscriptionRequest
	): Promise<RentSubscriptionResponse> {
		const userId = req.user?.id
		if (!userId) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.createSubscription(userId, request)
	}

	/**
	 * List all subscriptions for current user
	 * GET /api/v1/subscriptions
	 */
	@Get()
	async listSubscriptions(
		@Request() req: AuthenticatedRequest
	): Promise<{ subscriptions: RentSubscriptionResponse[] }> {
		const userId = req.user?.id
		if (!userId) {
			throw new Error('User not authenticated')
		}

		const subscriptions =
			await this.subscriptionsService.listSubscriptions(userId)
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
		const userId = req.user?.id
		if (!userId) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.getSubscription(id, userId)
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
		const userId = req.user?.id
		if (!userId) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.updateSubscription(id, userId, update)
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
		const userId = req.user?.id
		if (!userId) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.pauseSubscription(id, userId)
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
		const userId = req.user?.id
		if (!userId) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.resumeSubscription(id, userId)
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
		const userId = req.user?.id
		if (!userId) {
			throw new Error('User not authenticated')
		}

		return this.subscriptionsService.cancelSubscription(id, userId)
	}
}
