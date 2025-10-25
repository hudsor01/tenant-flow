/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct service calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	Controller,
	Get,
	Logger,
	NotFoundException,
	Req
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'

@Controller('users')
export class UsersController {
	private readonly logger = new Logger(UsersController.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get current user with Stripe customer ID
	 *
	 * This endpoint joins auth.users (from JWT) with stripe.customers (from Sync Engine)
	 * to provide the user's Stripe customer ID for Customer Portal access
	 *
	 * Returns:
	 * - id: auth.users.id (from JWT)
	 * - email: auth.users.email (from JWT)
	 * - stripeCustomerId: stripe.customers.id (from Stripe Sync Engine)
	 */
	@Get('me')
	@SkipSubscriptionCheck()
	async getCurrentUser(@Req() req: AuthenticatedRequest) {
		const authUserId = req.user.id // auth.users.id from JWT
		const authUserEmail = req.user.email

		if (!authUserEmail) {
			throw new NotFoundException(
				'User email not found in authentication token'
			)
		}

		this.logger.debug('Fetching current user data', {
			userId: authUserId,
			email: authUserEmail
		})

		// Get Stripe customer ID using the indexed user_id column
		// stripe.customers is auto-populated by Stripe Sync Engine
		// user_id column is set by webhook when customer.created/updated events occur
		let stripeCustomerId: string | null = null

		try {
			const { data, error } = await this.supabaseService!.rpcWithRetries(
				'get_stripe_customer_by_user_id',
				{ p_user_id: authUserId },
				2 // Only 2 attempts for fast failure
			)

			if (error) {
				this.logger.warn('Could not fetch Stripe customer ID', {
					error: error.message || String(error),
					userId: authUserId
				})
			} else {
				stripeCustomerId = data || null
			}
		} catch (error) {
			// If function doesn't exist yet or stripe schema not ready,
			// gracefully degrade to null customer ID
			this.logger.debug('Stripe customer lookup not available', {
				error: error instanceof Error ? error.message : String(error)
			})
		}

		const response = {
			id: authUserId,
			email: authUserEmail,
			stripeCustomerId
		}

		this.logger.debug('Current user data fetched', {
			userId: authUserId,
			hasStripeCustomer: !!stripeCustomerId
		})

		return response
	}
}
