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
import { user_idByStripeCustomerSchema } from '@repo/shared/validation/database-rpc.schemas'

@Injectable()
export class StripeCustomerOwnershipGuard implements CanActivate {
	private readonly logger = new Logger(StripeCustomerOwnershipGuard.name)

	constructor(private readonly supabase: SupabaseService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user_id = request.user?.id

		if (!user_id) {
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
		const ownsCustomer = await this.verifyCustomerOwnership(user_id, customerId)
		if (!ownsCustomer) {
			this.logger.warn('StripeCustomerOwnershipGuard: Customer access denied', {
				user_id,
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
		user_id: string,
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
			const validatedResult = user_idByStripeCustomerSchema.safeParse(rpcResult)
			if (!validatedResult.success) {
				this.logger.error('RPC response validation failed', {
					errors: validatedResult.error.issues,
					customerId
				})
				return false
			}

			const { data: owneruser_id, error } = validatedResult.data

			// Check if there's an error or no user found
			if (error || !owneruser_id) {
				this.logger.warn('No user found for Stripe customer', {
					customerId,
					error: error?.message
				})
				return false
			}

			// Verify the requesting user matches the owner
			return owneruser_id === user_id
		} catch (error) {
			this.logger.error('Error verifying Stripe customer ownership', {
				user_id,
				customerId,
				error: error instanceof Error ? error.message : 'Unknown error'
			})
			return false
		}
	}
}