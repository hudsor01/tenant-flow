/**
 * Stripe Connected Guard
 *
 * Ensures property owner has completed Stripe Connect onboarding
 * before performing payment-related operations.
 *
 * Usage:
 * @UseGuards(AuthGuard, StripeConnectedGuard)
 * @Post('tenants/invite')
 * async inviteTenant(@User() owner: AuthenticatedUser) {
 *   // Guaranteed owner has valid Stripe account
 * }
 */

import {
	BadRequestException,
	type CanActivate,
	type ExecutionContext,
	Injectable
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class StripeConnectedGuard implements CanActivate {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user_id = request.user?.id

		if (!user_id) {
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getAdminClient()

		// Get user's Stripe Connect status from stripe_connected_accounts table
		const { data: stripeAccount, error: ownerError } = await client
			.from('stripe_connected_accounts')
			.select('stripe_account_id')
			.eq('user_id', user_id)
			.single()

		if (ownerError || !stripeAccount) {
			this.logger.error(
				'StripeConnectedGuard: Failed to fetch Stripe account',
				{
					user_id,
					error: ownerError
				}
			)
			throw new BadRequestException('Stripe account not found')
		}

		// Get user's onboarding status from users table
		const { data: user, error: userError } = await client
			.from('users')
			.select('onboarding_completed_at')
			.eq('id', user_id)
			.single()

		if (userError || !user) {
			this.logger.error('StripeConnectedGuard: Failed to fetch user', {
				user_id,
				error: userError
			})
			throw new BadRequestException('User not found')
		}

		// Verify Stripe Connected Account exists
		if (!stripeAccount.stripe_account_id) {
			this.logger.warn('StripeConnectedGuard: Missing connected account', {
				user_id
			})
			throw new BadRequestException(
				'Please complete Stripe onboarding before inviting tenants. Go to Settings → Billing to set up payments.'
			)
		}

		// Verify onboarding is complete
		if (!user.onboarding_completed_at) {
			this.logger.warn('StripeConnectedGuard: Onboarding incomplete', {
				user_id
			})
			throw new BadRequestException(
				'Your Stripe account setup is incomplete. Please complete onboarding in Settings → Billing before inviting tenants.'
			)
		}

		// Attach connected account ID to request for ConnectedAccountId decorator
		// NestJS pattern: Guards validate, decorators extract
		request.connectedAccountId = stripeAccount.stripe_account_id

		return true
	}
}
