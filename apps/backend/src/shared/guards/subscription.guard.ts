import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	Logger,
	SetMetadata,
	UnauthorizedException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import type { AuthenticatedRequest } from '../types/express-request.types'
import { SupabaseService } from '../../database/supabase.service'

export const SKIP_SUBSCRIPTION_CHECK_KEY = 'skipSubscriptionCheck'
export const SkipSubscriptionCheck = () =>
	SetMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true)

@Injectable()
export class SubscriptionGuard implements CanActivate {
	private readonly logger = new Logger(SubscriptionGuard.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
			context.getHandler(),
			context.getClass()
		])

		const skipSubscriptionCheck = this.reflector.getAllAndOverride<boolean>(
			SKIP_SUBSCRIPTION_CHECK_KEY,
			[context.getHandler(), context.getClass()]
		)

		if (isPublic || skipSubscriptionCheck) {
			return true
		}

		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user = request.user

		if (!user) {
			throw new UnauthorizedException('Authentication required')
		}

		// Tenant-facing routes are covered by invite-only access and do not require payment
		if (user.role === 'TENANT') {
			return true
		}

		const featureAccessResult = await this.supabaseService.rpcWithRetries(
			'check_user_feature_access',
			{
				p_user_id: user.id,
				p_feature: 'basic_properties'
			},
			2
		)

		let hasAccess = this.normalizeBoolean(featureAccessResult.data)

		if (featureAccessResult.error) {
			this.logger.error('Subscription RPC failed', {
				userId: user.id,
				error: featureAccessResult.error?.message
			})
		}

		// Fallback to direct user profile check if RPC indicates no access
		if (!hasAccess) {
			const { data: profile, error } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('subscription_status, stripeCustomerId')
				.eq('supabaseId', user.id)
				.single()

			if (error) {
				this.logger.error('Failed to load user profile for subscription check', {
					userId: user.id,
					error: error.message
				})
			}

			if (profile) {
				const validStatuses = ['active', 'trialing']
				const status = profile.subscription_status?.toLowerCase()
				hasAccess =
					!!profile.stripeCustomerId &&
					!!status &&
					validStatuses.includes(status)
			}
		}

		if (!hasAccess) {
			this.logger.warn('Access denied: Active subscription required', {
				userId: user.id,
				endpoint: request.url
			})
			throw new ForbiddenException({
				code: 'SUBSCRIPTION_REQUIRED',
				message: 'An active subscription is required to use this feature.'
			})
		}

		return true
	}

	private normalizeBoolean(value: unknown): boolean {
		if (typeof value === 'boolean') return value
		if (typeof value === 'number') return value === 1
		if (typeof value === 'string') {
			const normalized = value.toLowerCase()
			return normalized === 'true' || normalized === 't' || normalized === '1'
		}
		return false
	}
}
