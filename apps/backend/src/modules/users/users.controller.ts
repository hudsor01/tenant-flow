/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
 * ONLY built-in NestJS pipes, native exceptions, direct service calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	Body,
	Controller,
	Get,
	Logger,
	NotFoundException,
	Patch,
	Req
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { SkipSubscriptionCheck } from '../../shared/guards/subscription.guard'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'

@Controller('users')
export class UsersController {
	private readonly logger = new Logger(UsersController.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly usersService: UsersService
	) {}

	/**
	 * Get current user with Stripe customer ID
	 *
	 * This endpoint joins auth.users (from JWT) with stripe.customers (from Sync Engine)
	 * to provide the user's Stripe customer ID for Customer Portal access
	 *
	 * Returns:
	 * - id: auth.users.id (from JWT)
	 * - email: auth.users.email (from JWT)
	 * - stripe_customer_id: stripe.customers.id (from Stripe Sync Engine)
	 */
	@Get('me')
	@SkipSubscriptionCheck()
	async getCurrentUser(@Req() req: AuthenticatedRequest) {
		const authuser_id = req.user.id // auth.users.id from JWT
		const authUserEmail = req.user.email

		if (!authUserEmail) {
			throw new NotFoundException(
				'User email not found in authentication token'
			)
		}

		this.logger.debug('Fetching current user data', {
			user_id: authuser_id,
			email: authUserEmail
		})

		// Get Stripe customer ID using the indexed user_id column
		// stripe.customers is auto-populated by Stripe Sync Engine
		// user_id column is set by webhook when customer.created/updated events occur
		let stripe_customer_id: string | null = null

		try {
			const { data, error } = await this.supabaseService!.rpcWithRetries(
				'get_stripe_customer_by_user_id',
				{ p_user_id: authuser_id },
				2 // Only 2 attempts for fast failure
			)

			if (error) {
				this.logger.warn('Could not fetch Stripe customer ID', {
					error: error.message || String(error),
					user_id: authuser_id
				})
			} else {
				stripe_customer_id = (data as string) || null
			}
		} catch (error) {
			// If function doesn't exist yet or stripe schema not ready,
			// gracefully degrade to null customer ID
			this.logger.debug('Stripe customer lookup not available', {
				error: error instanceof Error ? error.message : String(error)
			})
		}

		const response = {
			id: authuser_id,
			email: authUserEmail,
			stripe_customer_id
		}

		this.logger.debug('Current user data fetched', {
			user_id: authuser_id,
			hasStripeCustomer: !!stripe_customer_id
		})

		return response
	}

	/**
	 * Update current user's profile
	 *
	 * Updates the authenticated user's profile information including:
	 * - first_name, last_name
	 * - email (must be unique)
	 * - phone, company, timezone, bio
	 */
	@Patch('profile')
	@SkipSubscriptionCheck()
	async updateProfile(
		@Req() req: AuthenticatedRequest,
		@Body() dto: UpdateProfileDto
	) {
		const user_id = req.user.id

		this.logger.debug('Updating user profile', {
			user_id,
			fields: Object.keys(dto)
		})

		const updatedUser = await this.usersService.updateUser(user_id, {
			first_name: dto.first_name,
			last_name: dto.last_name,
			email: dto.email,
			phone: dto.phone ?? null,
			
		})

		this.logger.log('User profile updated successfully', { user_id })

		return {
			id: updatedUser.id,
			first_name: updatedUser.first_name,
			last_name: updatedUser.last_name,
			email: updatedUser.email,
			phone: updatedUser.phone,
			
		}
	}
}
