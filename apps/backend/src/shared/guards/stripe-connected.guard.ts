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
	Injectable,
	Logger
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class StripeConnectedGuard implements CanActivate {
	private readonly logger = new Logger(StripeConnectedGuard.name)

	constructor(private readonly supabase: SupabaseService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const userId = request.user?.id

		if (!userId) {
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getAdminClient()

		// Get user's Stripe Connect status
		const { data: user, error } = await client
			.from('users')
			.select('connectedAccountId, onboardingComplete')
			.eq('id', userId)
			.single()

		if (error || !user) {
			this.logger.error('StripeConnectedGuard: Failed to fetch user', {
				userId,
				error
			})
			throw new BadRequestException('User not found')
		}

		// Verify Stripe Connected Account exists
		if (!user.connectedAccountId) {
			this.logger.warn(
				'StripeConnectedGuard: Missing connected account',
				{ userId }
			)
			throw new BadRequestException(
				'Please complete Stripe onboarding before inviting tenants. Go to Settings → Billing to set up payments.'
			)
		}

		// Verify onboarding is complete
		if (!user.onboardingComplete) {
			this.logger.warn(
				'StripeConnectedGuard: Onboarding incomplete',
				{ userId }
			)
			throw new BadRequestException(
				'Your Stripe account setup is incomplete. Please complete onboarding in Settings → Billing before inviting tenants.'
			)
		}

		// Attach connected account ID to request for ConnectedAccountId decorator
		// NestJS pattern: Guards validate, decorators extract
		request.connectedAccountId = user.connectedAccountId

		return true
	}
}
