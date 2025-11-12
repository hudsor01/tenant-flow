/**
 * Stripe Customer Ownership Guard
 *
 * Ensures authenticated users can only access Stripe customer resources
 * (payment methods, subscriptions, etc.) that belong to them.
 *
 * Uses the get_user_id_by_stripe_customer RPC function to verify ownership
 * through the stripe.customers table populated by Stripe Sync Engine.
 */

import {
	type CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
	Logger
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { SupabaseService } from '../../database/supabase.service'
import { userIdByStripeCustomerSchema } from '@repo/shared/validation/database-rpc.schemas'

@Injectable()
export class StripeCustomerOwnershipGuard implements CanActivate {
	private readonly logger = new Logger(StripeCustomerOwnershipGuard.name)

	constructor(private readonly supabase: SupabaseService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const userId = request.user?.id

		if (!userId) {
			this.logger.warn('StripeCustomerOwnershipGuard: No user ID in request')
			throw new ForbiddenException('Authentication required')
		}

		// Extract customer ID from request parameters
		const customerId = request.params?.id || request.params?.customerId

		if (!customerId) {
			this.logger.warn('StripeCustomerOwnershipGuard: No customer ID in request')
			throw new ForbiddenException('Customer ID required')
		}

		// Verify ownership using RPC function
		const ownsCustomer = await this.verifyCustomerOwnership(userId, customerId)
		if (!ownsCustomer) {
			this.logger.warn('StripeCustomerOwnershipGuard: Customer access denied', {
				userId,
				customerId
			})
			throw new ForbiddenException(
				'You do not have access to this Stripe customer resource'
			)
		}

		return true
	}

	/**
	 * Verify that a user owns a Stripe customer
	 */
	private async verifyCustomerOwnership(
		userId: string,
		customerId: string
	): Promise<boolean> {
		try {
			// Use RPC function to get user_id associated with the Stripe customer
			const rpcResult = await this.supabase.rpcWithRetries(
				'get_user_id_by_stripe_customer',
				{ p_stripe_customer_id: customerId },
				3 // retry attempts
			)

			// Validate response with Zod schema
			const validatedResult = userIdByStripeCustomerSchema.safeParse(rpcResult)
			if (!validatedResult.success) {
				this.logger.error('RPC response validation failed', {
					errors: validatedResult.error.issues,
					customerId
				})
				return false
			}

			const { data: ownerUserId, error } = validatedResult.data

			// Check if there's an error or no user found
			if (error || !ownerUserId) {
				this.logger.warn('No user found for Stripe customer', {
					customerId,
					error: error?.message
				})
				return false
			}

			// Verify the requesting user matches the owner
			return ownerUserId === userId
		} catch (error) {
			this.logger.error('Error verifying Stripe customer ownership', {
				userId,
				customerId,
				error: error instanceof Error ? error.message : 'Unknown error'
			})
			return false
		}
	}
}